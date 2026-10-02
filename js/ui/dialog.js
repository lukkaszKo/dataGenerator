// własne okno potwierdzenia zamiast natywnego confirm(); zwraca Promise<boolean>
export function ask({title, message, confirmLabel = 'OK', cancelLabel = 'Anuluj', danger = false}){
  return new Promise(resolve=>{
    const d = document.createElement('dialog');
    d.className = 'dialog';
    d.setAttribute('aria-labelledby', 'dlg-title');
    d.innerHTML =
      `<form method="dialog">
         <h3 id="dlg-title"></h3><p></p>
         <div class="actions">
           <button type="submit" value="cancel" class="btn ghost" data-cancel></button>
           <button type="submit" value="ok" class="btn ${danger ? 'danger' : 'primary'}" data-ok></button>
         </div>
       </form>`;
    d.querySelector('h3').textContent = title;
    d.querySelector('p').textContent = message;
    d.querySelector('[data-cancel]').textContent = cancelLabel;
    d.querySelector('[data-ok]').textContent = confirmLabel;
    d.addEventListener('close', ()=>{ resolve(d.returnValue === 'ok'); d.remove(); });
    document.body.appendChild(d);
    d.showModal();
    // przy działaniach destrukcyjnych domyślnie zaznaczone jest „Anuluj”
    d.querySelector(danger ? '[data-cancel]' : '[data-ok]').focus();
  });
}
