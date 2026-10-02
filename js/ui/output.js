import {$, tpl} from '../dom.js';
import {state, notifyChange} from '../state.js';
import {quoteBare, parseTemplate, jsonErrorText, usedTokens} from '../template/parse.js';
import {fill, GenError} from '../template/fill.js';
import {p2} from '../generators/random.js';
import {toast} from './toast.js';
import {numberLines} from './editor.js';
import {fetchPhotos, PHOTO_LIMIT} from './photos.js';
import {photoValue} from '../generators/photo.js';

let lastOutput = '';

function highlight(json){
  const esc = json.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return esc.replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
    (m, str, colon, lit)=>{
      if(str) return colon ? `<span class="k">${str}</span>${colon}` : `<span class="s">${str}</span>`;
      if(lit) return `<span class="l">${lit}</span>`;
      return `<span class="n">${m}</span>`;
    });
}

function showOutError(msg){
  lastOutput = '';
  const out = $('#out'); out.classList.add('placeholder');
  out.innerHTML = ''; const s=document.createElement('span'); s.style.color='var(--bad)'; s.textContent=msg; out.appendChild(s);
  $('#out-gutter').hidden = true;
  $('#out-meta').textContent='';
}

const listeners = [];
// zapis do historii podpina history.js; output.js nie zna historii (brak cyklu importów)
export const onGenerate = fn => listeners.push(fn);

// pokazuje gotowy wynik w panelu „Wynik” (też wpis z historii); note dopisuje się do paska pod wynikiem
// kolorowanie składni (regex po całym tekście) dla wyników rzędu dziesiątek MB, np. ze zdjęciami, zawiesiłoby kartę
const HIGHLIGHT_MAX = 1_000_000;

export function showOutput(value, meta){
  lastOutput = JSON.stringify(value, null, 2);
  const out = $('#out');
  out.classList.remove('placeholder');
  if(lastOutput.length > HIGHLIGHT_MAX){
    out.textContent = lastOutput;
    meta += ` · duży wynik (${(lastOutput.length / 1e6).toFixed(1)} MB): bez kolorowania składni`;
  } else out.innerHTML = highlight(lastOutput);
  numberLines($('#out-gutter'), lastOutput);
  $('#out-gutter').hidden = false;
  $('#out-meta').textContent = meta;
}

let generating = false;

// zmienne ZDJĘCIE faktycznie użyte w szablonie (każda dostaje osobne zdjęcie w każdym rekordzie)
const usedPhotoVars = () => {
  const names = new Set(usedTokens(tpl.value).map(t=>t.name));
  return state.vars.filter(v=>v.type==='photo' && names.has(v.name));
};

function setBusy(busy, label){
  const btn = $('#btn-gen');
  btn.disabled = busy;
  btn.textContent = busy ? label : 'Generuj';
}

// record:false — pokaż wynik bez wpisu do historii (np. po wczytaniu zapisanego widoku);
// szablony ze zdjęciami wtedy nie są generowane, żeby samo wczytanie widoku nie pobierało obrazów z sieci
export async function generate({record = true} = {}){
  if(generating) return;
  let template, value;
  try{ template = parseTemplate(tpl.value); }
  catch(e){ showOutError(jsonErrorText(e, quoteBare(tpl.value))+' Popraw szablon i spróbuj ponownie.'); return; }
  const raw = parseInt($('#count').value, 10);
  const n = Math.max(1, Math.min(500, raw || 1));
  if(raw !== n){
    toast(Number.isNaN(raw) ? 'Podaj liczbę rekordów (1–500). Ustawiono 1.' : `Liczba rekordów musi mieścić się w zakresie 1–500. Ustawiono ${n}.`);
    $('#count').value = n;
    notifyChange();
  }

  // zdjęcia pobieramy z góry (asynchronicznie), reszta wartości jest losowana synchronicznie
  const photoVars = usedPhotoVars();
  let photos = [];
  if(photoVars.length){
    if(!record){ clearOutput(); return; }
    const need = n * photoVars.length;
    if(need > PHOTO_LIMIT){
      showOutError(`Zdjęcia są pobierane z internetu, więc jedno generowanie obejmuje maks. ${PHOTO_LIMIT} zdjęć, a potrzeba ${need} (${n} rekordów × ${photoVars.length} zmiennych ZDJĘCIE). Zmniejsz liczbę rekordów.`);
      return;
    }
    generating = true;
    setBusy(true, 'Pobieram zdjęcia…');
    $('#out-meta').textContent = `Pobieranie zdjęć 0/${need}…`;
    try{ photos = await fetchPhotos(need, (done)=>{ $('#out-meta').textContent = `Pobieranie zdjęć ${done}/${need}…`; }); }
    catch(e){ showOutError(e.message); return; }
    finally{ generating = false; setBusy(false); }
  }

  try{
    const records = [];
    for(let i=0;i<n;i++){
      const ctx = {};
      photoVars.forEach((v, j)=>{ ctx[v.name] = photoValue(v, photos[i * photoVars.length + j]); });
      records.push(fill(template, ctx, state.vars));
    }
    value = n===1 ? records[0] : records;
  }catch(e){
    if(e instanceof GenError){ showOutError(e.message); return; } throw e;
  }
  const t = new Date();
  showOutput(value, `${n===1?'1 rekord':n+' rekordów'} · wygenerowano ${p2(t.getHours())}:${p2(t.getMinutes())}:${p2(t.getSeconds())}`);
  if(record) listeners.forEach(fn=>fn({records:n, output:value}));
}

export function clearOutput(){
  lastOutput = '';
  const out = $('#out'); out.classList.add('placeholder');
  out.textContent = 'Kliknij „Generuj”, aby wypełnić szablon losowymi danymi.';
  $('#out-gutter').hidden = true;
  $('#out-meta').textContent = '';
}

export function initOutput(){
  $('#count').addEventListener('input', notifyChange);
  $('#btn-download').addEventListener('click', ()=>{
    if(!lastOutput){ toast('Najpierw wygeneruj dane'); return; }
    const t = new Date(), stamp = `${t.getFullYear()}${p2(t.getMonth()+1)}${p2(t.getDate())}-${p2(t.getHours())}${p2(t.getMinutes())}${p2(t.getSeconds())}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lastOutput + '\n'], {type:'application/json'}));
    a.download = `wynik-${stamp}.json`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  });
  $('#btn-gen').addEventListener('click', ()=>generate());
  $('#count').addEventListener('keydown', e=>{ if(e.key==='Enter') generate(); });
  tpl.addEventListener('keydown', e=>{ if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){ e.preventDefault(); generate(); } });

  $('#btn-copy').addEventListener('click', ()=>{
    if(!lastOutput){ toast('Najpierw wygeneruj dane'); return; }
    const fallback = ()=>{ const r=document.createRange(); r.selectNodeContents($('#out')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); toast('Zaznaczono wynik, skopiuj skrótem Ctrl+C'); };
    try{ navigator.clipboard.writeText(lastOutput).then(()=>toast('Skopiowano do schowka'), fallback); }
    catch(e){ fallback(); }
  });
}
