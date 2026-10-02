import {$} from '../dom.js';
import {snapshot} from '../state.js';
import {toast} from './toast.js';
import {ask} from './dialog.js';
import {api, ApiError, qs, fail} from './api.js';
import {bindMenu} from './menu.js';
import {onGenerate, showOutput} from './output.js';
import {applySnapshot, confirmDiscard, currentViewName} from './views.js';
import {shrinkLongStrings} from '../template/shrink.js';

let items = [];

const pad = n => String(n).padStart(2, '0');
const time = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
function dayLabel(ts){
  const now = Date.now(), key = dayKey(ts);
  if(key === dayKey(now)) return 'Dzisiaj';
  if(key === dayKey(now - 86400000)) return 'Wczoraj';
  return new Date(ts).toLocaleDateString('pl-PL', {day:'numeric', month:'long', year:'numeric'});
}
const recordsLabel = n => n===1 ? '1 rekord' : n + ' rekordów';

function itemRow(it){
  const el = document.createElement('div');
  el.className = 'row hist-row' + (it.pinned ? ' pinned' : '');
  el.setAttribute('role', 'listitem');
  el.innerHTML =
    `<div class="hist-main">
       <span class="hist-head"><span class="hist-pin" aria-hidden="true" hidden>📌</span><span class="hist-time"></span><span class="hist-meta"></span></span>
       <span class="hist-view" hidden></span>
       <span class="hist-prev"></span>
     </div>
     <span class="row-actions always">
       <button type="button" class="menu-btn" aria-haspopup="menu" aria-label="Akcje wpisu historii" title="Akcje: pokaż, kopiuj, przypnij, usuń">⋯</button>
       <div class="menu" role="menu">
         <button type="button" role="menuitem" data-act="show">Pokaż wynik</button>
         <button type="button" role="menuitem" data-act="copy">Kopiuj</button>
         <button type="button" role="menuitem" data-act="restore" ${it.hasSource ? '' : 'hidden'}>Przywróć szablon i zmienne</button>
         <button type="button" role="menuitem" data-act="pin"></button>
         <button type="button" role="menuitem" data-act="del" class="danger">Usuń</button>
       </div>
     </span>`;
  el.querySelector('.hist-pin').hidden = !it.pinned;
  el.querySelector('.hist-time').textContent = time(it.createdAt);
  el.querySelector('.hist-meta').textContent = recordsLabel(it.records) + (it.truncated ? ' · zdjęcia skrócone' : '');
  if(it.view){ const v = el.querySelector('.hist-view'); v.hidden = false; v.textContent = 'widok: ' + it.view; }
  el.querySelector('.hist-prev').textContent = it.preview;
  el.querySelector('[data-act="pin"]').textContent = it.pinned ? 'Odepnij' : 'Przypnij';
  el.title = `${new Date(it.createdAt).toLocaleString('pl-PL')}\n${it.preview}`;
  bindMenu(el.querySelector('.row-actions'));
  el.querySelector('[data-act="show"]').addEventListener('click', ()=>show(it));
  el.querySelector('[data-act="copy"]').addEventListener('click', ()=>copy(it));
  el.querySelector('[data-act="restore"]').addEventListener('click', ()=>restore(it));
  el.querySelector('[data-act="pin"]').addEventListener('click', ()=>togglePin(it));
  el.querySelector('[data-act="del"]').addEventListener('click', ()=>remove(it));
  return el;
}

const label = text => { const l = document.createElement('div'); l.className = 'group-lbl hist-day'; l.textContent = text; return l; };

function render(){
  const box = $('#hist'); box.innerHTML = '';
  $('#hist-clear').hidden = !items.some(i=>!i.pinned);
  if(!items.length){
    const h = document.createElement('div'); h.className = 'tree-hint'; h.textContent = 'Brak historii. Kliknij „Generuj”, a wynik pojawi się tutaj.'; box.appendChild(h);
    return;
  }
  const pinned = items.filter(i=>i.pinned);
  if(pinned.length){ box.appendChild(label('Przypięte')); pinned.forEach(it=>box.appendChild(itemRow(it))); }
  let day = null;
  items.filter(i=>!i.pinned).forEach(it=>{
    const k = dayKey(it.createdAt);
    if(k !== day){ day = k; box.appendChild(label(dayLabel(it.createdAt))); }
    box.appendChild(itemRow(it));
  });
}

async function refresh(){
  try{ items = await api('GET', '/api/history'); render(); }
  catch(e){
    const box = $('#hist'); box.innerHTML = '';
    const d = document.createElement('div'); d.className = 'empty'; d.textContent = e.message; box.appendChild(d);
  }
}

const fetchItem = it => api('GET', '/api/history/item?' + qs({id:it.id}));

async function show(it){
  try{
    const d = await fetchItem(it);
    showOutput(d.output, `${recordsLabel(d.records)} · z historii, ${new Date(d.createdAt).toLocaleString('pl-PL')}${d.truncated ? ' · długie wartości (zdjęcia) są skrócone' : ''}`);
  }catch(e){ fail(e); }
}

async function copy(it){
  try{
    const d = await fetchItem(it);
    await navigator.clipboard.writeText(JSON.stringify(d.output, null, 2));
    toast(d.truncated ? 'Skopiowano (długie wartości, np. zdjęcia, są w historii skrócone)' : 'Skopiowano do schowka');
  }catch(e){ e instanceof ApiError ? fail(e) : toast('Nie udało się skopiować do schowka'); }
}

// wraca do szablonu i zmiennych, z których powstał ten wynik
async function restore(it){
  if(!await confirmDiscard('Przywrócić szablon i zmienne z historii?')) return;
  try{
    const d = await fetchItem(it);
    if(!d.source) throw new ApiError('Ten wpis nie ma zapisanego szablonu.');
    applySnapshot(d.source);
    toast(`Przywrócono szablon i zmienne z ${time(d.createdAt)}`);
  }catch(e){ fail(e); }
}

async function togglePin(it){
  try{ await api('PUT', '/api/history/pin?' + qs({id:it.id, pinned: it.pinned ? '0' : '1'})); await refresh(); }
  catch(e){ fail(e); }
}

// usunięcie można cofnąć: odtwarzamy wpis z tym samym czasem i przypięciem
async function remove(it){
  try{
    const d = await fetchItem(it);
    await api('DELETE', '/api/history?' + qs({id:it.id}));
    await refresh();
    toast('Usunięto wpis historii', 'Cofnij', async ()=>{
      try{
        await api('POST', '/api/history', {records:d.records, output:d.output, truncated:d.truncated, source:d.source, createdAt:d.createdAt, pinned:it.pinned});
        await refresh();
      }catch(e){ fail(e); }
    });
  }catch(e){ fail(e); }
}

async function clearAll(){
  const ok = await ask({title:'Wyczyścić historię?', message:'Wpisy z folderu history/ zostaną skasowane z dysku. Przypięte wpisy zostają.', confirmLabel:'Wyczyść', danger:true});
  if(!ok) return;
  try{ await api('DELETE', '/api/history'); toast('Wyczyszczono historię (przypięte zostały)'); await refresh(); }
  catch(e){ fail(e); }
}

export async function initHistory(){
  // każde „Generuj” zapisuje w history/ wynik razem z szablonem i zmiennymi; brak serwera nie psuje generowania
  onGenerate(async payload=>{
    const {output, truncated} = shrinkLongStrings(payload.output);
    try{ await api('POST', '/api/history', {records:payload.records, output, truncated, source:{...snapshot(), view:currentViewName()}}); await refresh(); }
    catch(e){ if(e instanceof ApiError) toast('Wynik nie trafił do historii: ' + e.message); }
  });
  $('#hist-clear').addEventListener('click', clearAll);
  await refresh();
}
