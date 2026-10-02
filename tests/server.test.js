import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let proc, base, dataDir;

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mockgen-'));
  proc = spawn(process.execPath, ['server.js'], {cwd:ROOT, env:{...process.env, PORT:'0', MOCKGEN_DATA:dataDir, HISTORY_LIMIT:'3'}});
  base = await new Promise((resolve, reject) => {
    let out = '';
    proc.stdout.on('data', d => { out += d; const m = /http:\/\/localhost:(\d+)/.exec(out); if(m) resolve(`http://localhost:${m[1]}`); });
    proc.on('exit', c => reject(new Error('serwer zakończył działanie: ' + c)));
  });
});
after(() => { proc.kill(); fs.rmSync(dataDir, {recursive:true, force:true}); });

const call = async (method, url, body, headers = {}) => {
  const res = await fetch(base + url, {method, headers: body ? {'Content-Type':'application/json', ...headers} : headers, body: body ? JSON.stringify(body) : undefined});
  const text = await res.text();
  let json = null; try{ json = JSON.parse(text); }catch(e){}
  return {status: res.status, json, text};
};

test('widoki: foldery, zapis, odczyt, przywracanie savedAt, usuwanie', async () => {
  assert.equal((await call('POST', '/api/folders', {name:'Klient Żółć'})).status, 201);
  assert.equal((await call('POST', '/api/folders', {name:'Klient Żółć'})).status, 409);
  const put = await call('PUT', '/api/views', {folder:'Klient Żółć', name:'zamówienia', vars:[{id:'a'}], tpl:'{}', count:'2', savedAt:1234});
  assert.equal(put.json.savedAt, 1234);
  const tree = (await call('GET', '/api/saved')).json;
  assert.equal(tree.folders[0].views[0].name, 'zamówienia');
  const got = await call('GET', '/api/views?folder=' + encodeURIComponent('Klient Żółć') + '&name=' + encodeURIComponent('zamówienia'));
  assert.equal(got.json.tpl, '{}');
  assert.equal((await call('DELETE', '/api/folders?name=' + encodeURIComponent('Klient Żółć'))).status, 409); // niepusty
  assert.equal((await call('DELETE', '/api/views?folder=' + encodeURIComponent('Klient Żółć') + '&name=' + encodeURIComponent('zamówienia'))).status, 200);
  assert.equal((await call('DELETE', '/api/folders?name=' + encodeURIComponent('Klient Żółć'))).status, 200);
});

test('bezpieczeństwo: nazwy, obcy origin, brak statycznego dostępu do danych', async () => {
  assert.equal((await call('PUT', '/api/views', {folder:'..', name:'x', vars:[], tpl:''})).status, 400);
  assert.equal((await call('PUT', '/api/views', {folder:'', name:'../../evil', vars:[], tpl:''})).status, 400);
  assert.equal((await call('GET', '/api/history/item?id=../../package')).status, 400);
  assert.equal((await call('POST', '/api/folders', {name:'x'}, {Origin:'http://evil.example'})).status, 403);
  for(const p of ['/server.js', '/package.json', '/saved/x.json', '/history/x.json']) assert.equal((await fetch(base + p)).status, 404);
});

test('historia: zapis ze źródłem, lista, przypinanie, limit, przywracanie, czyszczenie', async () => {
  const src = {vars:[{id:'a', type:'vin', name:'v'}], tpl:'{"a":"{{v}}"}', count:'1', view:'Mój widok'};
  const a = (await call('POST', '/api/history', {records:1, output:{a:1}, source:src})).json.id;
  assert.equal((await call('POST', '/api/history', {records:1, output:1, source:{vars:'zle'}})).status, 400);
  assert.equal((await call('POST', '/api/history', {output:1})).status, 400);

  let list = (await call('GET', '/api/history')).json;
  assert.equal(list.length, 1);
  assert.equal(list[0].view, 'Mój widok');
  assert.equal(list[0].hasSource, true);
  const item = (await call('GET', '/api/history/item?id=' + a)).json;
  assert.deepEqual(item.source, src);

  // przypięty wpis przetrwa limit (3 nieprzypięte)
  assert.equal((await call('PUT', `/api/history/pin?id=${a}&pinned=1`)).status, 200);
  for(let i=0;i<6;i++) await call('POST', '/api/history', {records:1, output:i});
  list = (await call('GET', '/api/history')).json;
  assert.equal(list.length, 4);
  assert.equal(list.filter(x=>x.pinned).length, 1);
  assert.ok(list.some(x=>x.id===a && x.pinned));

  // odpięcie wraca do limitu
  await call('PUT', `/api/history/pin?id=${a}&pinned=0`);
  assert.equal((await call('GET', '/api/history')).json.length, 3);

  // przywracanie z zachowaniem czasu
  const old = Date.UTC(2020, 0, 2, 3, 4, 5);
  const restored = (await call('POST', '/api/history', {records:1, output:'x', createdAt:old, pinned:true})).json.id;
  const meta = (await call('GET', '/api/history')).json.find(x=>x.id===restored);
  assert.equal(meta.createdAt, old);
  assert.equal(meta.pinned, true);

  // „Wyczyść” zostawia przypięte
  await call('DELETE', '/api/history');
  const rest = (await call('GET', '/api/history')).json;
  assert.deepEqual(rest.map(x=>x.id), [restored]);
  assert.equal((await call('DELETE', '/api/history?id=' + restored)).status, 200);
  assert.equal((await call('DELETE', '/api/history?id=' + restored)).status, 404);
});

test('zdjęcie: /api/photo zwraca base64 z zewnętrznego serwisu i obsługuje błędy', async () => {
  const {createServer} = await import('node:http');
  const {spawn: sp} = await import('node:child_process');
  const jpeg = Buffer.from([0xFF,0xD8,0xFF,0xE0,0,16,0x4A,0x46,0x49,0x46,0,1,1,0,0,1,0,1,0,0,0xFF,0xD9]);
  let mode = 'image';
  const fake = createServer((req, res) => {
    if(mode === 'image'){ res.writeHead(200, {'Content-Type':'image/jpeg'}); res.end(jpeg); }
    else if(mode === 'html'){ res.writeHead(200, {'Content-Type':'text/html'}); res.end('<html>for sale</html>'); }
    else { res.writeHead(500); res.end(); }
  });
  await new Promise(r => fake.listen(0, '127.0.0.1', r));
  const photoUrl = `http://127.0.0.1:${fake.address().port}/random-person.jpeg`;
  const p2 = sp(process.execPath, ['server.js'], {cwd:ROOT, env:{...process.env, PORT:'0', MOCKGEN_DATA:dataDir, MOCKGEN_PHOTO_URL:photoUrl}});
  const b2 = await new Promise(resolve => p2.stdout.on('data', d => { const m = /http:\/\/localhost:(\d+)/.exec(String(d)); if(m) resolve(`http://localhost:${m[1]}`); }));
  try{
    const get = async () => { const r = await fetch(b2 + '/api/photo'); return {status:r.status, json:await r.json()}; };
    let r = await get();
    assert.equal(r.status, 200);
    assert.equal(r.json.mime, 'image/jpeg');
    assert.equal(Buffer.from(r.json.base64, 'base64').equals(jpeg), true);
    mode = 'html';
    r = await get(); assert.equal(r.status, 502); assert.match(r.json.error, /nie zwrócił obrazu/);
    mode = 'error';
    r = await get(); assert.equal(r.status, 502);
  } finally { p2.kill(); fake.close(); }
});

test('historia: flaga „skrócone” trafia do listy', async () => {
  await call('DELETE', '/api/history');
  await call('POST', '/api/history', {records:1, output:{foto:'AAA…[skrócono]'}, truncated:true});
  const list = (await call('GET', '/api/history')).json;
  assert.equal(list[0].truncated, true);
  await call('DELETE', '/api/history');
});
