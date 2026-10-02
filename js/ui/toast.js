import {$} from '../dom.js';

let toastTimer;
export function toast(msg, actionLabel, action){
  const t = $('#toast'); t.innerHTML=''; const s=document.createElement('span'); s.textContent=msg; t.appendChild(s);
  if(actionLabel){ const b=document.createElement('button'); b.type='button'; b.textContent=actionLabel; b.addEventListener('click',()=>{ action(); t.hidden=true; }); t.appendChild(b); }
  t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.hidden=true, actionLabel?6000:2600);
}
