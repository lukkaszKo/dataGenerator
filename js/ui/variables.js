import {$} from '../dom.js';
import {state, newId} from '../state.js';
import {copyName} from '../template/names.js';
import {TYPES, GROUPS, isPersonType} from '../generators/index.js';
import {GENDERS, NATS} from '../data/names.js';
import {FORMATS} from '../generators/date.js';
import {toast} from './toast.js';
import {openType, closeType} from './modal.js';
import {insertToken, updateStatus} from './editor.js';

const ICON_EDIT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M10.5 2.5l3 3L6 13H3v-3z"/></svg>';
const ICON_COPY = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 3.5v-.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5"/></svg>';
const ICON_DEL = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

function shortDT(s){ return s.replace('T',' ').replace(/:00$/,'').slice(0,16); }

function describe(v){
  if(v.type==='bool') return `true: ${v.prob}% · ${v.as==='bool' ? 'boolean' : 'tekst'}`;
  if(v.type==='dict'){
    const shown = v.values.slice(0,3).map(x=>JSON.stringify(x)).join(', ');
    return `${v.values.length} ${v.values.length===1?'wartość':'wartości'}: ${shown}${v.values.length>3?', …':''}`;
  }
  if(v.type==='number') return `${v.min} – ${v.max} · ${v.dec ? v.dec+' po przecinku' : 'całkowita'} · ${v.as==='num' ? 'liczba' : 'tekst'}`;
  if(v.type==='photo') return `${v.format==='datauri' ? 'data URI' : 'base64'} · JPEG z thispersondoesnotexist.com`;
  if(v.type==='vin') return '17 znaków · z cyfrą kontrolną';
  if(v.type==='nip') return `10 cyfr · ${v.format==='dashes' ? 'z myślnikami' : 'bez myślników'}`;
  if(v.type==='regon') return `${v.length} cyfr`;
  if(v.type==='pesel') return `${GENDERS[v.gender]} · ur. ${v.from} → ${v.to}`;
  if(isPersonType(v.type)) return `${GENDERS[v.gender]} · ${NATS[v.nat]}`;
  const f = FORMATS.find(x=>x.id===v.format);
  return `${shortDT(v.from)} → ${shortDT(v.to)} · ${f ? f.label : v.format}`;
}

export function renderVars(){
  $('#tpl-hint').hidden = state.vars.length > 0; // wskazówka „jak zacząć” tylko dopóki nie ma zmiennych
  const box = $('#vars'); box.innerHTML = '';
  if(!state.vars.length){
    box.innerHTML = '<div class="empty">Brak zmiennych. Wybierz typ powyżej i zatwierdź konfigurację.</div>';
  }
  const lists = {};
  GROUPS.forEach(g=>{
    const items = state.vars.filter(v=>g.types.includes(v.type));
    if(!items.length) return;
    const sec = document.createElement('div'); sec.className='var-group';
    sec.innerHTML = `<div class="var-group-head"><span class="group-lbl">${g.label}</span><span class="cnt">${items.length}</span></div><div class="var-list"></div>`;
    box.appendChild(sec);
    g.types.forEach(t=>lists[t]=sec.querySelector('.var-list'));
  });
  const order = t => Object.keys(TYPES).indexOf(t);
  [...state.vars].sort((a,b)=>order(a.type)-order(b.type)).forEach(v=>{
    const el = document.createElement('div');
    el.className = 'var '+v.type + (state.editing===v.id ? ' editing' : '');
    el.innerHTML =
      `<button type="button" class="var-main" title="Wstaw do szablonu">
         <span class="var-tag">${TYPES[v.type].label}</span>
         <span class="var-name"></span><span class="var-params"></span>
       </button>
       <button type="button" class="icon-btn" data-act="edit" aria-label="Edytuj">${ICON_EDIT}</button>
       <button type="button" class="icon-btn" data-act="copy" aria-label="Duplikuj" title="Duplikuj zmienną">${ICON_COPY}</button>
       <button type="button" class="icon-btn del" data-act="del" aria-label="Usuń">${ICON_DEL}</button>`;
    el.querySelector('.var-name').textContent = v.name;
    el.querySelector('.var-params').textContent = describe(v);
    el.querySelector('.var-main').addEventListener('click', ()=>{
      insertToken(`{{${v.name}}}`);
    });
    el.querySelector('[data-act="edit"]').addEventListener('click', ()=>openType(v.type, v));
    el.querySelector('[data-act="copy"]').addEventListener('click', ()=>duplicateVar(v.id));
    el.querySelector('[data-act="del"]').addEventListener('click', ()=>removeVar(v.id));
    (lists[v.type] || box).appendChild(el);
  });
}

function duplicateVar(id){
  const i = state.vars.findIndex(v=>v.id===id); if(i<0) return;
  const copy = {...structuredClone(state.vars[i]), id:newId(), name:copyName(state.vars[i].name, state.vars)};
  state.vars.splice(i + 1, 0, copy);
  renderVars(); updateStatus();
  toast(`Zduplikowano jako „${copy.name}”`);
}

function removeVar(id){
  const i = state.vars.findIndex(v=>v.id===id); if(i<0) return;
  const [v] = state.vars.splice(i,1);
  if(state.editing===id) closeType();
  renderVars(); updateStatus();
  toast(`Usunięto „${v.name}”`, 'Cofnij', ()=>{ state.vars.splice(i,0,v); renderVars(); updateStatus(); });
}
