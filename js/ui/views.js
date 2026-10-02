import {$, tpl} from '../dom.js';
import {state, snapshot, onChange, isDirty, markClean, getBaseline, setBaseline} from '../state.js';
import {toast} from './toast.js';
import {ask} from './dialog.js';
import {closeType} from './modal.js';
import {renderVars} from './variables.js';
import {updateStatus} from './editor.js';
import {generate, clearOutput} from './output.js';
import {api, ApiError, qs, fail} from './api.js';
import {bindMenu} from './menu.js';

const OPEN = 'mockgen-openfolders';   // rozwinięte foldery

const svg = (body, extra='') => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;
const ICON = {
  chev: svg('<path d="M6 4l4 4-4 4"/>'),
  folder: svg('<path d="M1.5 4v8.5h13V5.5H7.5l-1.5-2h-4.5z"/>'),
  folderOpen: svg('<path d="M1.5 12.5V3.5h4.5l1.5 2h7v7z"/><path d="M1.5 12.5l2-5h12l-2 5"/>'),
  file: svg('<path d="M3.5 1.5h6l3 3v10h-9z"/><path d="M9.5 1.5v3h3"/>')
};

let treeData = {folders:[], views:[]};
let current = null;                 // {folder, name} — zapisany lub załadowany widok, z którym pracujesz
let selected = '';                  // folder docelowy zapisu ('' = główny)
let adding = null;                  // null | 'folder' | 'view' — wiersz z polem tekstowym
let expanded = new Set();

export const currentViewName = () => current?.name ?? null;

const when = ts => new Date(ts).toLocaleString('pl-PL', {dateStyle:'short', timeStyle:'short'});
const plural = n => n===1 ? 'zmienna' : (n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20)) ? 'zmienne' : 'zmiennych';
const inFolder = folder => folder ? ` w folderze „${folder}”` : '';

function remember(){
  try{ localStorage.setItem(OPEN, JSON.stringify([...expanded])); }catch(e){}
}

// wstawia stan do aplikacji (zmienne, szablon, liczba rekordów) bez zapisu do historii
export function applySnapshot(snap){
  state.vars = structuredClone(snap.vars);
  tpl.value = snap.tpl;
  $('#count').value = snap.count || 1;
  closeType(); renderVars(); updateStatus();
  if(tpl.value.trim()) generate({record:false}); else clearOutput();
}

// zanim bieżący stan zostanie zastąpiony: jeśli są niezapisane zmiany, zapytaj
export async function confirmDiscard(action){
  if(!isDirty()) return true;
  return ask({
    title: 'Niezapisane zmiany',
    message: `${action} Bieżący widok ma niezapisane zmiany, które zostaną utracone.`,
    confirmLabel: 'Kontynuuj', danger: true
  });
}

/* ---------- pasek stanu: bieżący widok i niezapisane zmiany ---------- */
function renderStatus(){
  const el = $('#view-status');
  el.innerHTML = '<span class="vs-label">Bieżący widok:</span> <strong class="vs-name"></strong><span class="vs-dirty" hidden> ● niezapisane zmiany</span>';
  el.querySelector('.vs-name').textContent = current ? (current.folder ? `${current.folder} / ${current.name}` : current.name) : 'bez nazwy';
  el.querySelector('.vs-dirty').hidden = !isDirty();
}

/* ---------- budowanie wierszy drzewa ---------- */
function row(level, cls){
  const el = document.createElement('div');
  el.className = 'row ' + (cls||'');
  el.style.setProperty('--lvl', level);
  return el;
}
const actBtn = (label, act, danger) => `<button type="button" class="act${danger ? ' danger' : ''}" data-act="${act}">${label}</button>`;

function rootRow(){
  const el = row(0, 'root' + (selected==='' ? ' selected' : ''));
  el.setAttribute('role', 'treeitem');
  el.innerHTML = `<button type="button" class="row-main"><span class="ico">${ICON.folderOpen}</span><span class="row-name">saved</span></button>`;
  el.title = 'Folder główny — tu zapisują się widoki bez folderu';
  el.querySelector('.row-main').addEventListener('click', ()=>{ selected = ''; renderTree(); });
  return el;
}

function folderRow(f){
  const open = expanded.has(f.name);
  const el = row(1, 'folder' + (open ? ' open' : '') + (selected===f.name ? ' selected' : ''));
  el.setAttribute('role', 'treeitem'); el.setAttribute('aria-expanded', String(open));
  el.innerHTML =
    `<button type="button" class="row-main"><span class="ico chev">${ICON.chev}</span><span class="ico">${open ? ICON.folderOpen : ICON.folder}</span><span class="row-name"></span></button>
     <span class="cnt">${f.views.length}</span>
     <span class="row-actions">${f.views.length ? '' : actBtn('Usuń', 'del', true)}</span>`;
  el.querySelector('.row-name').textContent = f.name;
  el.title = f.name;
  el.querySelector('.row-main').addEventListener('click', ()=>{
    selected = f.name;
    if(expanded.has(f.name)) expanded.delete(f.name); else expanded.add(f.name);
    remember(); renderTree();
  });
  el.querySelector('[data-act="del"]')?.addEventListener('click', ()=>deleteFolder(f.name));
  return el;
}

function viewRow(folder, v, level){
  const isCurrent = current && current.folder===folder && current.name===v.name;
  const el = row(level, 'view' + (isCurrent ? ' current' : ''));
  el.setAttribute('role', 'treeitem');
  el.innerHTML =
    `<span class="ico">${ICON.file}</span><span class="row-name"></span>
     <span class="row-actions always">
       <button type="button" class="menu-btn" aria-haspopup="menu" aria-label="Akcje widoku" title="Akcje: wczytaj, zaktualizuj, usuń">⋯</button>
       <div class="menu" role="menu">
         <button type="button" role="menuitem" data-act="load">Wczytaj</button>
         <button type="button" role="menuitem" data-act="update" title="Zapisz bieżący stan w tym widoku">Zaktualizuj</button>
         <button type="button" role="menuitem" data-act="del" class="danger">Usuń</button>
       </div>
     </span>`;
  el.querySelector('.menu-btn').setAttribute('aria-label', `Akcje widoku „${v.name}”`);
  el.querySelector('.row-name').textContent = v.name;
  el.title = `${v.name}\n${v.vars} ${plural(v.vars)} · ${when(v.savedAt)}`;
  bindMenu(el.querySelector('.row-actions'));
  el.querySelector('[data-act="load"]').addEventListener('click', ()=>loadView(folder, v.name));
  el.querySelector('[data-act="update"]').addEventListener('click', ()=>updateView(folder, v.name));
  el.querySelector('[data-act="del"]').addEventListener('click', ()=>deleteView(folder, v.name));
  return el;
}

// wiersz z polem tekstowym (jak nowy plik/folder w VS Code): Enter = zatwierdź, Esc/kliknięcie obok = anuluj
function inputRow(level, icon, placeholder, initial, okLabel, onSubmit){
  const el = row(level);
  el.innerHTML = `<span class="ico">${icon}</span><input class="row-input" autocomplete="off" spellcheck="false">
    <span class="row-actions" style="display:flex"><button type="button" class="act" data-act="ok" title="Zatwierdź (Enter)"></button><button type="button" class="act" data-act="no" title="Anuluj (Esc)" aria-label="Anuluj">✕</button></span>`;
  el.querySelector('[data-act="ok"]').textContent = okLabel;
  const input = el.querySelector('input');
  input.placeholder = placeholder; input.value = initial || '';
  input.setAttribute('aria-label', placeholder);
  let busy = false;
  const cancel = () => { if(busy || adding===null) return; adding = null; renderTree(); };
  const submit = async () => {
    const name = input.value.trim();
    if(!name){ toast('Wpisz nazwę.'); input.focus(); return; }
    busy = true;
    const ok = await onSubmit(name);
    busy = false;
    if(ok){ adding = null; renderTree(); } else input.focus();
  };
  input.addEventListener('keydown', e=>{
    if(e.key==='Escape') cancel();
    if(e.key==='Enter'){ e.preventDefault(); submit(); }
  });
  // mousedown nie może odbierać fokusu polu, inaczej blur anulowałby wiersz przed kliknięciem
  el.querySelectorAll('.act').forEach(b=>b.addEventListener('mousedown', e=>e.preventDefault()));
  el.querySelector('[data-act="ok"]').addEventListener('click', submit);
  el.querySelector('[data-act="no"]').addEventListener('click', cancel);
  input.addEventListener('blur', ()=>setTimeout(cancel, 120));
  setTimeout(()=>{ input.focus(); input.select(); });
  return el;
}

function renderTree(){
  const box = $('#tree'); box.innerHTML = '';
  box.appendChild(rootRow());
  const saveAtRoot = adding==='view' && selected==='';
  if(adding==='folder') box.appendChild(inputRow(1, ICON.folder, 'nazwa folderu', '', 'Dodaj', createFolder));

  treeData.folders.forEach(f=>{
    box.appendChild(folderRow(f));
    if(!expanded.has(f.name)) return;
    if(adding==='view' && selected===f.name) box.appendChild(inputRow(2, ICON.file, 'nazwa widoku', current?.name, 'Zapisz', saveView));
    if(!f.views.length && !(adding==='view' && selected===f.name)){
      const h = document.createElement('div'); h.className = 'tree-hint'; h.style.setProperty('--lvl', 2); h.textContent = 'Pusty folder.'; box.appendChild(h);
    }
    f.views.forEach(v=>box.appendChild(viewRow(f.name, v, 2)));
  });

  if(saveAtRoot) box.appendChild(inputRow(1, ICON.file, 'nazwa widoku', current?.name, 'Zapisz', saveView));
  treeData.views.forEach(v=>box.appendChild(viewRow('', v, 1)));

  if(!treeData.folders.length && !treeData.views.length && !adding){
    const h = document.createElement('div'); h.className = 'tree-hint'; h.style.setProperty('--lvl', 1);
    h.textContent = 'Brak zapisanych widoków. Kliknij „Zapisz widok” albo „Dodaj folder”.'; box.appendChild(h);
  }
  renderStatus();
}

async function refresh(){
  try{ treeData = await api('GET', '/api/saved'); if(selected && !treeData.folders.some(f=>f.name===selected)) selected = ''; renderTree(); }
  catch(e){
    const box = $('#tree'); box.innerHTML = '';
    const d = document.createElement('div'); d.className = 'empty'; d.textContent = e.message; box.appendChild(d);
  }
}

/* ---------- operacje ---------- */
const exists = (folder, name) =>
  (folder ? treeData.folders.find(f=>f.name===folder)?.views : treeData.views)?.some(v=>v.name.toLowerCase()===name.toLowerCase());

async function saveView(name){
  if(exists(selected, name) && !await ask({title:'Nadpisać widok?', message:`Widok „${name}”${inFolder(selected)} już istnieje. Zapisana wersja zostanie zastąpiona bieżącym stanem.`, confirmLabel:'Nadpisz', danger:true})) return false;
  try{
    await api('PUT', '/api/views', {folder:selected, name, ...snapshot()});
    current = {folder:selected, name}; markClean();
    toast(`Zapisano „${name}”${inFolder(selected)}`);
    adding = null; await refresh();
    return true;
  }catch(e){ fail(e); return false; }
}

async function createFolder(name){
  try{
    await api('POST', '/api/folders', {name});
    selected = name; expanded.add(name); remember();
    toast(`Utworzono folder „${name}”`);
    adding = null; await refresh();
    return true;
  }catch(e){ fail(e); return false; }
}

async function loadView(folder, name){
  if(!await confirmDiscard(`Załadować „${name}”?`)) return;
  try{
    const prev = snapshot(), prevBaseline = getBaseline(), prevCurrent = current;
    const d = await api('GET', '/api/views?' + qs({folder, name}));
    if(!Array.isArray(d.vars) || typeof d.tpl !== 'string') throw new ApiError('Plik widoku ma nieprawidłowy format.');
    applySnapshot(d);
    current = {folder, name}; selected = folder; markClean(); renderTree();
    toast(`Załadowano „${name}”`, 'Cofnij', ()=>{ applySnapshot(prev); current = prevCurrent; setBaseline(prevBaseline); renderTree(); });
  }catch(e){ fail(e); }
}

// aktualizuje zapisany widok bieżącym stanem; bez pytania (skrót Ctrl+S) lub z pytaniem (menu „Zaktualizuj”)
async function updateView(folder, name, {askFirst = true} = {}){
  if(askFirst && !await ask({title:'Zaktualizować widok?', message:`Zapisana wersja „${name}”${inFolder(folder)} zostanie zastąpiona bieżącymi zmiennymi, szablonem i liczbą rekordów.`, confirmLabel:'Zaktualizuj', danger:true})) return;
  try{
    await api('PUT', '/api/views', {folder, name, ...snapshot()});
    current = {folder, name}; selected = folder; markClean();
    toast(`Zaktualizowano „${name}”`);
    await refresh();
  }catch(e){ fail(e); }
}

// Ctrl+S: aktualizuje bieżący widok, a gdy go nie ma — otwiera pole z nazwą nowego
export async function quickSave(){
  if(current && exists(current.folder, current.name)) return updateView(current.folder, current.name, {askFirst:false});
  adding = 'view'; if(selected) expanded.add(selected); renderTree();
}

// usunięcie można cofnąć: zachowujemy zawartość pliku i przy „Cofnij” zapisujemy ją z powrotem
async function deleteView(folder, name){
  try{
    const doc = await api('GET', '/api/views?' + qs({folder, name}));
    await api('DELETE', '/api/views?' + qs({folder, name}));
    if(current && current.folder===folder && current.name===name){ current = null; }
    await refresh();
    toast(`Usunięto „${name}”`, 'Cofnij', async ()=>{
      try{
        await api('PUT', '/api/views', {folder, name, vars:doc.vars, tpl:doc.tpl, count:doc.count, savedAt:doc.savedAt});
        await refresh();
      }catch(e){ fail(e); }
    });
  }catch(e){ fail(e); }
}

async function deleteFolder(name){
  try{
    await api('DELETE', '/api/folders?' + qs({name}));
    await refresh();
    toast(`Usunięto folder „${name}”`, 'Cofnij', async ()=>{
      try{ await api('POST', '/api/folders', {name}); await refresh(); }catch(e){ fail(e); }
    });
  }catch(e){ fail(e); }
}

async function newView(){
  if(!await confirmDiscard('Zacząć od pustego widoku?')) return;
  const prev = snapshot(), prevBaseline = getBaseline(), prevCurrent = current;
  applySnapshot({vars:[], tpl:'', count:1});
  current = null; markClean(); renderTree();
  toast('Pusty widok', 'Cofnij', ()=>{ applySnapshot(prev); current = prevCurrent; setBaseline(prevBaseline); renderTree(); });
}

export async function initViews(){
  try{ expanded = new Set(JSON.parse(localStorage.getItem(OPEN)) || []); }catch(e){ expanded = new Set(); }

  $('#tool-save').addEventListener('click', ()=>{
    adding = 'view'; if(selected) expanded.add(selected); renderTree();
  });
  $('#tool-folder').addEventListener('click', ()=>{ adding = 'folder'; renderTree(); });
  $('#tool-empty').addEventListener('click', newView);
  onChange(renderStatus);
  renderStatus();
  await refresh();
}
