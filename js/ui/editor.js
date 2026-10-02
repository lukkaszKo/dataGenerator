import {$, tpl} from '../dom.js';
import {state, notifyChange} from '../state.js';
import {quoteBare, parseTemplate, jsonErrorText, usedTokens, inStringAt} from '../template/parse.js';
import {toast} from './toast.js';
import {SAMPLE_JSON} from '../data/sample.js';

export function insertToken(token){
  const s = tpl.selectionStart ?? tpl.value.length, e = tpl.selectionEnd ?? s;
  const text = inStringAt(tpl.value, s) ? token : `"${token}"`;
  tpl.focus();
  tpl.setRangeText(text, s, e, 'end');
  updateStatus();
}

export function numberLines(el, text){
  const n = text ? text.split('\n').length : 1;
  el.textContent = Array.from({length:n}, (_, i)=>i+1).join('\n');
}

export function updateStatus(){
  notifyChange();
  numberLines($('#tpl-gutter'), tpl.value);
  const st = $('#tpl-status'); st.innerHTML='';
  const add = (cls, html)=>{ const s=document.createElement('span'); s.className=cls; s.innerHTML=html; st.appendChild(s); };
  const esc = s => s.replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  if(!tpl.value.trim()){ add('mut','Szablon jest pusty.'); return; }
  const src = quoteBare(tpl.value);
  try{ JSON.parse(src); add('ok','✓ JSON poprawny'); }
  catch(e){ add('bad', esc(jsonErrorText(e, src))); }
  const used = usedTokens(tpl.value);
  const names = [...new Set(used.map(u=>u.name))];
  const known = names.filter(n=>state.vars.some(v=>v.name===n));
  const unknown = names.filter(n=>!state.vars.some(v=>v.name===n));
  if(known.length) add('mut','Użyte: '+known.map(n=>`<code>${esc(n)}</code>`).join(', '));
  if(unknown.length) add('bad','Nieznane: '+unknown.map(n=>`<code>${esc(n)}</code>`).join(', '));
  const badFields = used.filter(u=>u.field && state.vars.some(v=>v.name===u.name));
  if(badFields.length) add('bad','Nieznane pola: '+[...new Set(badFields.map(u=>`<code>${esc(u.name+'.'+u.field)}</code>`))].join(', '));
}

export function initEditor(){
  tpl.addEventListener('keydown', e=>{
    if(e.key==='Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey){
      e.preventDefault(); tpl.setRangeText('  ', tpl.selectionStart, tpl.selectionEnd, 'end');
    }
  });
  tpl.addEventListener('input', ()=>{ numberLines($('#tpl-gutter'), tpl.value); notifyChange(); });
  tpl.addEventListener('scroll', ()=>{ $('#tpl-gutter').scrollTop = tpl.scrollTop; });
  let statusTimer;
  tpl.addEventListener('input', ()=>{ clearTimeout(statusTimer); statusTimer=setTimeout(()=>{ updateStatus(); }, 250); });

  $('#btn-format').addEventListener('click', ()=>{
    try{ tpl.value = JSON.stringify(parseTemplate(tpl.value), null, 2); updateStatus(); toast('Sformatowano szablon'); }
    catch(e){ updateStatus(); toast('Nie można sformatować: popraw błąd JSON'); }
  });
  $('#btn-sample').addEventListener('click', ()=>{
    const prev = tpl.value;
    tpl.value = JSON.stringify(SAMPLE_JSON, null, 2); updateStatus();
    toast('Wstawiono przykładowy JSON', prev.trim() ? 'Cofnij' : undefined, ()=>{ tpl.value=prev; updateStatus(); });
  });
  $('#btn-clear').addEventListener('click', ()=>{
    const prev = tpl.value; tpl.value=''; updateStatus();
    toast('Wyczyszczono szablon', 'Cofnij', ()=>{ tpl.value=prev; updateStatus(); });
  });
}
