import {$} from '../dom.js';

const KEY = 'mockgen-theme';
const MODES = ['auto', 'light', 'dark'];
const LABEL = {auto:'auto', light:'jasny', dark:'ciemny'};
let mode = 'auto';

function apply(){
  const root = document.documentElement;
  if(mode === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = mode;
  $('#theme-toggle').textContent = 'Motyw: ' + LABEL[mode];
}

export function initTheme(){
  try{ const saved = localStorage.getItem(KEY); if(MODES.includes(saved)) mode = saved; }catch(e){}
  apply();
  $('#theme-toggle').addEventListener('click', ()=>{
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    try{ localStorage.setItem(KEY, mode); }catch(e){}
    apply();
  });
}
