// Lokalny serwer: pliki statyczne aplikacji + zapis widoków (./saved) i historii generowania (./history)
// Uruchomienie: npm start  (http://localhost:3000)
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.MOCKGEN_DATA ? path.resolve(process.env.MOCKGEN_DATA) : ROOT; // zmienna tylko dla testów
const SAVED = path.join(DATA, 'saved');
const HISTORY = path.join(DATA, 'history');
const HISTORY_LIMIT = Number(process.env.HISTORY_LIMIT) || 200; // tyle ostatnich NIEprzypiętych wyników zostaje w history/
const PORT = process.env.PORT === undefined ? 3000 : Number(process.env.PORT);
const HOST = '127.0.0.1';
const MAX_BODY = 32 * 1024 * 1024; // zdjęcia base64 w wynikach są duże (ok. 0,7 MB sztuka)
// serwis zmienił adres: główna strona to dziś „domain for sale”, a losowe zdjęcie zwraca /random-person.jpeg
const PHOTO_URL = process.env.MOCKGEN_PHOTO_URL || 'https://thispersondoesnotexist.com/random-person.jpeg';
const PHOTO_MAX_BYTES = 4 * 1024 * 1024;

const MIME = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.ico':'image/x-icon'};
// statycznie wystawiamy tylko aplikację — nigdy saved/, history/, server.js ani package.json
const isPublic = rel => rel === 'index.html' || rel.startsWith('css/') || rel.startsWith('js/');

class HttpError extends Error { constructor(status, message){ super(message); this.status = status; } }

const NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} _.\-()]{0,79}$/u;
function checkName(name, what){
  if(typeof name !== 'string' || !NAME_RE.test(name) || /[. ]$/.test(name))
    throw new HttpError(400, `Nieprawidłowa nazwa ${what}. Dozwolone: litery, cyfry, spacja, „_”, „-”, „.”, „()”; maks. 80 znaków.`);
  return name;
}
function folderPath(folder){
  return folder ? path.join(SAVED, checkName(folder, 'folderu')) : SAVED;
}
const viewPath = (folder, name) => path.join(folderPath(folder), checkName(name, 'widoku') + '.json');

const exists = p => fs.access(p).then(()=>true, ()=>false);

async function listViews(dir){
  const out = [];
  for(const f of await fs.readdir(dir, {withFileTypes:true})){
    if(!f.isFile() || !f.name.endsWith('.json')) continue;
    const file = path.join(dir, f.name);
    let vars = 0, savedAt = (await fs.stat(file)).mtimeMs;
    try{ const d = JSON.parse(await fs.readFile(file, 'utf8')); vars = d.vars?.length ?? 0; savedAt = d.savedAt ?? savedAt; }catch(e){}
    out.push({name: f.name.slice(0, -5), vars, savedAt});
  }
  return out.sort((a,b)=>b.savedAt - a.savedAt);
}

async function tree(){
  await fs.mkdir(SAVED, {recursive:true});
  const folders = [];
  for(const d of await fs.readdir(SAVED, {withFileTypes:true})){
    if(d.isDirectory() && !d.name.startsWith('.')) folders.push({name:d.name, views: await listViews(path.join(SAVED, d.name))});
  }
  folders.sort((a,b)=>a.name.localeCompare(b.name, 'pl'));
  return {views: await listViews(SAVED), folders};
}

/* ---------- historia ----------
   history/<RRRR-MM-DD_gg-mm-ss-mmm>.json      — zwykły wpis (id = nazwa bez rozszerzenia, sortuje się chronologicznie)
   history/<id>.pin.json                        — wpis przypięty (nie jest kasowany przy limicie) */
const HISTORY_ID_RE = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}$/;
const HISTORY_FILE_RE = /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3})(\.pin)?\.json$/;
const checkHistoryId = id => { if(typeof id !== 'string' || !HISTORY_ID_RE.test(id)) throw new HttpError(400, 'Nieprawidłowy identyfikator wpisu historii.'); return id; };
const historyFileName = (id, pinned) => id + (pinned ? '.pin' : '') + '.json';
const pad = (n, l=2) => String(n).padStart(l, '0');
const idFromDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${pad(d.getMilliseconds(),3)}`;

async function historyEntries(){
  await fs.mkdir(HISTORY, {recursive:true});
  return (await fs.readdir(HISTORY))
    .map(f=>HISTORY_FILE_RE.exec(f)).filter(Boolean)
    .map(m=>({id:m[1], pinned:!!m[2], file:path.join(HISTORY, m[0])}))
    .sort((a,b)=>b.id.localeCompare(a.id));
}
async function findHistory(id){
  checkHistoryId(id);
  const e = (await historyEntries()).find(x=>x.id===id);
  if(!e) throw new HttpError(404, 'Nie ma takiego wpisu historii.');
  return e;
}

// podglądy trzymamy w pamięci: lista nie czyta z dysku wszystkich plików przy każdym odświeżeniu
const metaCache = new Map();
async function historyMeta(e){
  let m = metaCache.get(e.id);
  if(!m){
    m = {createdAt:0, records:0, preview:'', view:null};
    try{
      const d = JSON.parse(await fs.readFile(e.file, 'utf8'));
      m = {createdAt:d.createdAt, records:d.records, preview:JSON.stringify(d.output).slice(0, 120), view:d.source?.view ?? null, hasSource:!!d.source, truncated:!!d.truncated};
    }catch(err){}
    metaCache.set(e.id, m);
  }
  return {id:e.id, pinned:e.pinned, ...m};
}
async function listHistory(){
  const out = [];
  for(const e of await historyEntries()) out.push(await historyMeta(e));
  return out;
}
async function pruneHistory(){
  const unpinned = (await historyEntries()).filter(e=>!e.pinned);
  for(const e of unpinned.slice(HISTORY_LIMIT)){ await fs.unlink(e.file); metaCache.delete(e.id); }
}

function checkSource(s){
  if(s === undefined || s === null) return undefined;
  if(typeof s !== 'object' || !Array.isArray(s.vars) || typeof s.tpl !== 'string') throw new HttpError(400, 'Pole „source” musi zawierać „vars” i „tpl”.');
  return {vars:s.vars, tpl:s.tpl, count:s.count, view:typeof s.view === 'string' ? s.view : null};
}

// pobiera losowe zdjęcie z zewnętrznego serwisu (przeglądarka nie może — CORS) i zwraca je jako base64
async function fetchPhoto(){
  let r;
  try{
    r = await fetch(PHOTO_URL, {headers:{'User-Agent':'Mozilla/5.0 (generator-mockow)', 'Accept':'image/*', 'Cache-Control':'no-cache'}, signal:AbortSignal.timeout(20000)});
  }catch(e){ throw new HttpError(502, 'Nie udało się połączyć z serwisem ze zdjęciami (thispersondoesnotexist.com). Sprawdź połączenie z internetem.'); }
  if(!r.ok) throw new HttpError(502, `Serwis ze zdjęciami odpowiedział błędem ${r.status}.`);
  const mime = (r.headers.get('content-type') || '').split(';')[0].trim();
  if(!mime.startsWith('image/')) throw new HttpError(502, 'Serwis ze zdjęciami nie zwrócił obrazu — być może zmienił adres lub przestał działać.');
  const buf = Buffer.from(await r.arrayBuffer());
  if(buf.length > PHOTO_MAX_BYTES) throw new HttpError(502, 'Zdjęcie z serwisu jest zbyt duże.');
  return {mime, bytes:buf.length, base64:buf.toString('base64')};
}

async function readBody(req){
  let size = 0; const chunks = [];
  for await (const c of req){ size += c.length; if(size > MAX_BODY) throw new HttpError(413, 'Zbyt duży widok.'); chunks.push(c); }
  try{ return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch(e){ throw new HttpError(400, 'Niepoprawny JSON w żądaniu.'); }
}

const send = (res, status, body, type='application/json; charset=utf-8') => {
  res.writeHead(status, {'Content-Type':type, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
};

async function api(req, res, url){
  const q = url.searchParams, route = `${req.method} ${url.pathname}`;
  await fs.mkdir(SAVED, {recursive:true});
  await fs.mkdir(HISTORY, {recursive:true});
  switch(route){
    case 'GET /api/saved': return send(res, 200, await tree());
    case 'POST /api/folders': {
      const {name} = await readBody(req);
      const dir = folderPath(checkName(name, 'folderu'));
      if(await exists(dir)) throw new HttpError(409, 'Folder o tej nazwie już istnieje.');
      await fs.mkdir(dir);
      return send(res, 201, {ok:true});
    }
    case 'DELETE /api/folders': {
      const dir = folderPath(checkName(q.get('name'), 'folderu'));
      if(!await exists(dir)) throw new HttpError(404, 'Nie ma takiego folderu.');
      try{ await fs.rmdir(dir); } catch(e){ throw new HttpError(409, 'Folder nie jest pusty — najpierw usuń zapisane w nim widoki.'); }
      return send(res, 200, {ok:true});
    }
    case 'GET /api/photo': return send(res, 200, await fetchPhoto());
    case 'GET /api/history': return send(res, 200, await listHistory());
    case 'POST /api/history': {
      const b = await readBody(req);
      if(b.output === undefined || !Number.isInteger(b.records)) throw new HttpError(400, 'Wpis historii musi zawierać „output” i „records”.');
      const source = checkSource(b.source);
      // createdAt/pinned podaje klient tylko przy przywracaniu usuniętego wpisu („Cofnij”)
      const base = Number.isFinite(b.createdAt) ? b.createdAt : Date.now();
      for(let i=0;; i++){ // ta sama milisekunda → kolejna wolna nazwa
        const createdAt = base + i, id = idFromDate(new Date(createdAt));
        try{
          const doc = {version:1, createdAt, records:b.records, output:b.output, ...(b.truncated ? {truncated:true} : {}), ...(source ? {source} : {})};
          await fs.writeFile(path.join(HISTORY, historyFileName(id, !!b.pinned)), JSON.stringify(doc, null, 2) + '\n', {flag:'wx'});
          await pruneHistory();
          return send(res, 201, {ok:true, id});
        }catch(e){ if(e.code !== 'EEXIST' || i > 50) throw e; }
      }
    }
    case 'GET /api/history/item': {
      const e = await findHistory(q.get('id'));
      return send(res, 200, await fs.readFile(e.file, 'utf8'));
    }
    case 'PUT /api/history/pin': {
      const e = await findHistory(q.get('id'));
      const pinned = q.get('pinned') === '1';
      if(e.pinned !== pinned) await fs.rename(e.file, path.join(HISTORY, historyFileName(e.id, pinned)));
      if(!pinned) await pruneHistory();
      return send(res, 200, {ok:true, pinned});
    }
    case 'DELETE /api/history': {
      if(q.get('id')){
        const e = await findHistory(q.get('id'));
        await fs.unlink(e.file); metaCache.delete(e.id);
      } else { // „Wyczyść”: kasuje tylko wpisy nieprzypięte
        for(const e of await historyEntries()) if(!e.pinned){ await fs.unlink(e.file); metaCache.delete(e.id); }
      }
      return send(res, 200, {ok:true});
    }
    case 'GET /api/views': {
      const file = viewPath(q.get('folder'), q.get('name'));
      if(!await exists(file)) throw new HttpError(404, 'Nie ma takiego widoku.');
      return send(res, 200, await fs.readFile(file, 'utf8'));
    }
    case 'PUT /api/views': {
      const b = await readBody(req);
      const file = viewPath(b.folder, b.name);
      if(b.folder && !await exists(folderPath(b.folder))) throw new HttpError(404, 'Nie ma takiego folderu.');
      if(!Array.isArray(b.vars) || typeof b.tpl !== 'string') throw new HttpError(400, 'Widok musi zawierać pola „vars” i „tpl”.');
      // savedAt podaje klient tylko przy przywracaniu usuniętego widoku („Cofnij”)
      const doc = {version:1, name:b.name, savedAt:Number.isFinite(b.savedAt) ? b.savedAt : Date.now(), vars:b.vars, tpl:b.tpl, count:b.count};
      await fs.writeFile(file, JSON.stringify(doc, null, 2) + '\n');
      return send(res, 200, {ok:true, savedAt:doc.savedAt});
    }
    case 'DELETE /api/views': {
      const file = viewPath(q.get('folder'), q.get('name'));
      if(!await exists(file)) throw new HttpError(404, 'Nie ma takiego widoku.');
      await fs.unlink(file);
      return send(res, 200, {ok:true});
    }
  }
  throw new HttpError(404, 'Nieznany adres API.');
}

async function serveStatic(res, pathname){
  const rel = path.posix.normalize(decodeURIComponent(pathname)).replace(/^\/+/, '') || 'index.html';
  if(rel.includes('..') || !isPublic(rel)) throw new HttpError(404, 'Nie znaleziono.');
  try{ send(res, 200, await fs.readFile(path.join(ROOT, rel)), MIME[path.extname(rel)] || 'application/octet-stream'); }
  catch(e){ throw new HttpError(404, 'Nie znaleziono.'); }
}

// ochrona przed żądaniami z obcych stron (CSRF / DNS rebinding): tylko localhost i ten sam origin
function trusted(req){
  const host = (req.headers.host || '').replace(/:\d+$/, '');
  if(host !== 'localhost' && host !== '127.0.0.1') return false;
  const origin = req.headers.origin;
  return !origin || origin === `http://${req.headers.host}`;
}

const server = http.createServer(async (req, res)=>{
  try{
    if(!trusted(req)) throw new HttpError(403, 'Niedozwolony adres.');
    const url = new URL(req.url, `http://${req.headers.host}`);
    if(url.pathname.startsWith('/api/')) await api(req, res, url);
    else if(req.method === 'GET') await serveStatic(res, url.pathname);
    else throw new HttpError(405, 'Metoda niedozwolona.');
  }catch(e){
    if(e instanceof HttpError) return send(res, e.status, {error:e.message});
    console.error(e);
    send(res, 500, {error:'Błąd serwera.'});
  }
});
server.listen(PORT, HOST, ()=>console.log(`Generator mocków: http://localhost:${server.address().port}  (widoki: ${SAVED}, historia: ${HISTORY})`));
