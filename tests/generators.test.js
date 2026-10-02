import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../js/generators/index.js';
import {fmtDate} from '../js/generators/date.js';
import {parseTemplate, quoteBare, usedTokens} from '../js/template/parse.js';
import {fill, GenError} from '../js/template/fill.js';

test('number: całkowita w zakresie', () => {
  for(let i=0;i<200;i++){
    const n = generate({type:'number', min:3, max:7, dec:0, as:'num'});
    assert.ok(Number.isInteger(n) && n>=3 && n<=7);
  }
});

test('date: format YYYY-MM-DD w zakresie', () => {
  const d = generate({type:'date', from:'2025-01-01T00:00:00', to:'2025-01-31T23:59:59', format:'YYYY-MM-DD'});
  assert.match(d, /^2025-01-\d{2}$/);
  assert.equal(fmtDate(new Date(2025,0,5), 'DDMMYYYY'), '05012025');
});

test('surname: forma żeńska', () => {
  const s = generate({type:'surname', nat:'PL', gender:'K'});
  assert.ok(typeof s === 'string' && s.length);
});

test('bool: prob 100 i 0', () => {
  assert.equal(generate({type:'bool', prob:100, as:'bool'}), true);
  assert.equal(generate({type:'bool', prob:0, as:'str'}), 'false');
});

test('quoteBare: placeholder bez cudzysłowu staje się stringiem', () => {
  assert.deepEqual(parseTemplate('{"wiek": {{wiek}}}'), {wiek:'{{wiek}}'});
  assert.deepEqual(usedTokens('"{{a}} {{b}}"').map(t=>t.name), ['a','b']);
  assert.equal(quoteBare('"{{x}}"'), '"{{x}}"');
});

test('fill: ta sama zmienna w rekordzie daje tę samą wartość, typ zachowany', () => {
  const vars = [{id:'1', type:'number', name:'n', min:1, max:1000000, dec:0, as:'num'}];
  const r = fill({a:'{{n}}', b:'x {{n}}'}, {}, vars);
  assert.equal(typeof r.a, 'number');
  assert.equal(r.b, 'x ' + r.a);
});

test('fill: nieznana zmienna rzuca GenError', () => {
  assert.throws(() => fill('{{brak}}', {}, []), GenError);
});

test('pesel: długość, suma kontrolna, płeć i data', () => {
  const W = [1,3,7,9,1,3,7,9,1,3];
  for(const [gender, from, to, century] of [['K','1960-01-01','1999-12-31',19],['M','2000-01-01','2024-12-31',20],['M','1850-01-01','1899-12-31',18],['K','2100-01-01','2150-12-31',21]]){
    for(let i=0;i<100;i++){
      const p = generate({type:'pesel', gender, from, to});
      assert.match(p, /^\d{11}$/);
      const sum = W.reduce((s,w,k)=>s+w*Number(p[k]),0);
      assert.equal(Number(p[10]), (10 - sum%10)%10);
      assert.equal(Number(p[9])%2, gender==='M' ? 1 : 0);
      const mm = Number(p.slice(2,4)), off = {18:80,19:0,20:20,21:40}[century];
      assert.ok(mm-off>=1 && mm-off<=12);
      const date = `${century}${p.slice(0,2)}-${String(mm-off).padStart(2,'0')}-${p.slice(4,6)}`;
      assert.ok(date>=from && date<=to, `${p} -> ${date}`);
    }
  }
  // znany poprawny PESEL: 44051401359
  assert.equal(Number('44051401359'[10]), (10 - [1,3,7,9,1,3,7,9,1,3].reduce((s,w,k)=>s+w*Number('44051401359'[k]),0)%10)%10);
});

test('vin: 17 znaków, bez I/O/Q, poprawna cyfra kontrolna', () => {
  const T = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9};
  const W = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
  for(let i=0;i<200;i++){
    const vin = generate({type:'vin'});
    assert.match(vin, /^[A-HJ-NPR-Z0-9]{17}$/);
    const sum = [...vin].reduce((s,c,k)=>s+(/\d/.test(c)?Number(c):T[c])*W[k],0);
    assert.equal(vin[8], sum%11===10 ? 'X' : String(sum%11));
  }
});

test('nip: 10 cyfr, suma kontrolna, format z myślnikami', () => {
  const W = [6,5,7,2,3,4,5,6,7];
  for(let i=0;i<300;i++){
    const nip = generate({type:'nip', format:'plain'});
    assert.match(nip, /^[1-9]\d{9}$/);
    const sum = W.reduce((s,w,k)=>s+w*Number(nip[k]),0);
    assert.equal(sum%11, Number(nip[9]));
  }
  assert.match(generate({type:'nip', format:'dashes'}), /^\d{3}-\d{3}-\d{2}-\d{2}$/);
});

test('regon: 9 i 14 cyfr z poprawnymi sumami kontrolnymi', () => {
  const w9 = [8,9,2,3,4,5,6,7], w14 = [2,4,8,5,0,9,7,3,6,1,2,4,8];
  const chk = (s, w) => w.reduce((a,x,k)=>a+x*Number(s[k]),0)%11%10;
  for(let i=0;i<200;i++){
    const r9 = generate({type:'regon', length:9});
    assert.match(r9, /^\d{9}$/);
    assert.equal(chk(r9, w9), Number(r9[8]));
    const r14 = generate({type:'regon', length:14});
    assert.match(r14, /^\d{14}$/);
    assert.equal(chk(r14.slice(0,9), w9), Number(r14[8]));
    assert.equal(chk(r14, w14), Number(r14[13]));
  }
  // znany poprawny REGON: 123456785
  assert.equal(chk('123456785', w9), 5);
});

test('names: podpowiedzi i nazwy kopii omijają zajęte', async () => {
  const {suggestName, copyName} = await import('../js/template/names.js');
  assert.equal(suggestName('person', []), 'imie_1');
  assert.equal(suggestName('person', [{name:'imie_1'}, {name:'imie_2'}]), 'imie_3');
  assert.equal(suggestName('bool', []), 'flaga_1');
  assert.equal(copyName('kwota', []), 'kwota_2');
  assert.equal(copyName('kwota', [{name:'kwota_2'}]), 'kwota_3');
  assert.equal(copyName('kwota_2', [{name:'kwota_3'}]), 'kwota_4');
});

test('photo: base64 i data URI', async () => {
  const {photoValue} = await import('../js/generators/photo.js');
  const p = {mime:'image/jpeg', base64:'QUJD'};
  assert.equal(photoValue({format:'base64'}, p), 'QUJD');
  assert.equal(photoValue({format:'datauri'}, p), 'data:image/jpeg;base64,QUJD');
  assert.throws(() => generate({type:'photo'}), /pobierane z sieci/);
});

test('shrink: długie napisy są skracane, krótkie zostają', async () => {
  const {shrinkLongStrings} = await import('../js/template/shrink.js');
  const long = 'A'.repeat(5000);
  const {output, truncated} = shrinkLongStrings({a:'ok', foto:long, lista:[{f:long}, 1, null]});
  assert.equal(truncated, true);
  assert.equal(output.a, 'ok');
  assert.match(output.foto, /^A{40}…\[skrócono, 5000 znaków\]$/);
  assert.match(output.lista[0].f, /5000 znaków/);
  assert.deepEqual(output.lista.slice(1), [1, null]);
  assert.equal(shrinkLongStrings({a:'x'}).truncated, false);
});
