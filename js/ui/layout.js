// na wąskich ekranach boczne panele są domyślnie zwinięte, żeby nie spychały głównego narzędzia w dół
export function initLayout(){
  const narrow = matchMedia('(max-width:980px)');
  document.querySelectorAll('.sidebar').forEach(sb=>{
    const btn = sb.querySelector('.collapse-btn');
    const set = collapsed => { sb.classList.toggle('collapsed', collapsed); btn.setAttribute('aria-expanded', String(!collapsed)); };
    btn.addEventListener('click', ()=>set(!sb.classList.contains('collapsed')));
    narrow.addEventListener('change', e=>set(e.matches));
    set(narrow.matches);
  });
}
