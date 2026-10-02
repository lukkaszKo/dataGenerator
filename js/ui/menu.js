// Menu „⋯” ma position:fixed, żeby nie obcinała go przewijana lista. Ustawiamy je przy przycisku
// (w górę, gdy brakuje miejsca) i przestawiamy przy przewijaniu oraz zmianie rozmiaru okna.
let open = null;

export function placeMenu(actions){
  requestAnimationFrame(()=>{
    const btn = actions.querySelector('.menu-btn'), menu = actions.querySelector('.menu');
    if(!btn || !menu) return;
    const b = btn.getBoundingClientRect();
    menu.style.right = Math.max(8, window.innerWidth - b.right) + 'px';
    const h = menu.offsetHeight;
    menu.style.top = (b.bottom + h + 8 > window.innerHeight ? b.top - h + 3 : b.bottom - 3) + 'px';
  });
}
const reposition = () => { if(open) placeMenu(open); };
window.addEventListener('scroll', reposition, true);
window.addEventListener('resize', reposition);

export function bindMenu(actions){
  const btn = actions.querySelector('.menu-btn'), menu = actions.querySelector('.menu');
  const items = () => [...menu.querySelectorAll('[role="menuitem"]')];
  const show = () => { open = actions; placeMenu(actions); };
  const hide = () => { if(open === actions && !actions.matches(':hover, :focus-within')) open = null; };
  actions.addEventListener('mouseenter', show);
  actions.addEventListener('focusin', show);
  actions.addEventListener('mouseleave', hide);
  actions.addEventListener('focusout', ()=>setTimeout(hide));

  btn.addEventListener('keydown', e=>{
    if(['ArrowDown', 'Enter', ' '].includes(e.key)){ e.preventDefault(); items()[0]?.focus(); }
  });
  menu.addEventListener('keydown', e=>{
    const list = items(), i = list.indexOf(document.activeElement);
    if(e.key === 'ArrowDown'){ e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if(e.key === 'Escape'){ e.preventDefault(); btn.focus(); btn.blur(); } // zamyka menu
  });
}
