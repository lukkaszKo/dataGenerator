import {$, tpl} from '../dom.js';
import {state, newId} from '../state.js';
import {isPersonType} from '../generators/index.js';
import {suggestName} from '../template/names.js';
import {FORMATS} from '../generators/date.js';
import {PESEL_MIN_YEAR, PESEL_MAX_YEAR} from '../generators/pesel.js';
import {toast} from './toast.js';
import {renderVars} from './variables.js';
import {updateStatus} from './editor.js';

const FORMS = ['#f-photo','#f-vin','#f-nip','#f-regon','#f-person','#f-pesel','#f-date','#f-number','#f-dict','#f-bool'];
const ERRORS = ['#ph-name-err','#vin-name-err','#nip-name-err','#rg-name-err','#ps-name-err','#ps-range-err','#p-name-err','#d-name-err','#d-range-err','#n-name-err','#n-range-err','#x-name-err','#x-values-err','#b-name-err','#b-prob-err'];

const NAME_FIELDS = Object.fromEntries(['p','ps','ph','vin','nip','rg','d','x','b','n'].map(k=>[`#${k}-name`, `#${k}-name-err`]));
const clearErrors = () => ERRORS.forEach(s=>$(s).textContent='');

export function openType(type, v){
  state.type = type;
  state.editing = v ? v.id : null;
  document.querySelectorAll('.type-chip').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.type===type)));
  $('#f-person').hidden = !isPersonType(type);
  $('#f-photo').hidden = type!=='photo';
  $('#f-vin').hidden = type!=='vin';
  $('#f-nip').hidden = type!=='nip';
  $('#f-regon').hidden = type!=='regon';
  $('#f-pesel').hidden = type!=='pesel';
  $('#f-date').hidden = type!=='date';
  $('#f-number').hidden = type!=='number';
  $('#f-dict').hidden = type!=='dict';
  $('#f-bool').hidden = type!=='bool';
  $('#type-hint').hidden = !!type;
  clearErrors();
  const edit = !!v;
  if(isPersonType(type)){
    const what = type==='surname' ? 'nazwisko' : 'imię';
    $('#p-title').textContent = edit ? 'Edytuj '+what : what[0].toUpperCase()+what.slice(1);
    $('#p-name').placeholder = type==='surname' ? 'np. nazwisko_klienta' : 'np. imie_klienta';
    $('#p-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#p-name').value = v ? v.name : suggestName(type, state.vars);
    $('#p-gender').value = v ? v.gender : 'K';
    $('#p-nat').value = v ? v.nat : 'PL';
    $('#p-name').focus(); $('#p-name').select();
  } else if(type==='photo'){
    $('#ph-title').textContent = edit ? 'Edytuj zdjęcie' : 'Zdjęcie';
    $('#ph-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#ph-name').value = v ? v.name : suggestName(type, state.vars);
    $('#ph-format').value = v ? v.format : 'base64';
    $('#ph-name').focus(); $('#ph-name').select();
  } else if(type==='vin'){
    $('#vin-title').textContent = edit ? 'Edytuj VIN' : 'VIN';
    $('#vin-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#vin-name').value = v ? v.name : suggestName(type, state.vars);
    $('#vin-name').focus(); $('#vin-name').select();
  } else if(type==='nip'){
    $('#nip-title').textContent = edit ? 'Edytuj NIP' : 'NIP';
    $('#nip-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#nip-name').value = v ? v.name : suggestName(type, state.vars);
    $('#nip-format').value = v ? v.format : 'plain';
    $('#nip-name').focus(); $('#nip-name').select();
  } else if(type==='regon'){
    $('#rg-title').textContent = edit ? 'Edytuj REGON' : 'REGON';
    $('#rg-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#rg-name').value = v ? v.name : suggestName(type, state.vars);
    $('#rg-len').value = v ? String(v.length) : '9';
    $('#rg-name').focus(); $('#rg-name').select();
  } else if(type==='pesel'){
    $('#ps-title').textContent = edit ? 'Edytuj PESEL' : 'PESEL';
    $('#ps-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#ps-name').value = v ? v.name : suggestName(type, state.vars);
    $('#ps-gender').value = v ? v.gender : 'K';
    $('#ps-from').value = v ? v.from : '1960-01-01';
    $('#ps-to').value = v ? v.to : '2005-12-31';
    $('#ps-name').focus(); $('#ps-name').select();
  } else if(type==='date'){
    $('#d-title').textContent = edit ? 'Edytuj datę' : 'Data';
    $('#d-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#d-name').value = v ? v.name : suggestName(type, state.vars);
    $('#d-from').value = v ? v.from : '2025-01-01T00:00:00';
    $('#d-to').value = v ? v.to : '2025-12-31T23:59:59';
    $('#d-format').value = v ? v.format : 'YYYY-MM-DD';
    $('#d-name').focus(); $('#d-name').select();
  } else if(type==='bool'){
    $('#b-title').textContent = edit ? 'Edytuj boolean' : 'Boolean';
    $('#b-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#b-name').value = v ? v.name : suggestName(type, state.vars);
    $('#b-prob').value = v ? v.prob : 50;
    $('#b-as').value = v ? v.as : 'bool';
    $('#b-name').focus(); $('#b-name').select();
  } else if(type==='dict'){
    $('#x-title').textContent = edit ? 'Edytuj słownik' : 'Słownik';
    $('#x-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#x-name').value = v ? v.name : suggestName(type, state.vars);
    $('#x-values').value = v ? JSON.stringify(v.values) : '';
    $('#x-name').focus(); $('#x-name').select();
  } else if(type==='number'){
    $('#n-title').textContent = edit ? 'Edytuj numer' : 'Numer';
    $('#n-submit').textContent = edit ? 'Zapisz zmiany' : 'Dodaj zmienną';
    $('#n-name').value = v ? v.name : suggestName(type, state.vars);
    $('#n-min').value = v ? v.min : 1;
    $('#n-max').value = v ? v.max : 1000;
    $('#n-dec').value = v ? String(v.dec) : '0';
    $('#n-as').value = v ? v.as : 'num';
    $('#n-name').focus(); $('#n-name').select();
  }
  renderVars();
}

export function closeType(){
  state.type = null; state.editing = null;
  document.querySelectorAll('.type-chip').forEach(b=>b.setAttribute('aria-pressed','false'));
  FORMS.forEach(s=>$(s).hidden = true);
  $('#type-hint').hidden = false;
  renderVars();
}

function validateName(name){
  if(!name) return 'Podaj nazwę zmiennej.';
  if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return 'Dozwolone litery bez polskich znaków, cyfry i „_”; nie może zaczynać się cyfrą.';
  if(state.vars.some(v=>v.name===name && v.id!==state.editing)) return `Zmienna „${name}” już istnieje.`;
  return '';
}

function upsert(data){
  if(state.editing){
    const v = state.vars.find(x=>x.id===state.editing);
    const oldName = v.name;
    Object.assign(v, data);
    if(oldName !== v.name){
      const re = new RegExp('\\{\\{\\s*'+oldName+'(\\.[A-Za-z_]\\w*)?\\s*\\}\\}','g');
      tpl.value = tpl.value.replace(re, (m,f)=>'{{'+v.name+(f||'')+'}}');
    }
    toast(`Zapisano zmiany w „${v.name}”`);
  } else {
    state.vars.push({id:newId(), ...data});
    toast(`Dodano zmienną „${data.name}”`);
  }
  closeType(); updateStatus();
}

export function initModal(){
  // komunikat znika, gdy poprawiasz pole; nazwa zmiennej jest sprawdzana na bieżąco
  FORMS.forEach(f=>$(f).addEventListener('input', e=>{
    clearErrors();
    const errSel = NAME_FIELDS['#' + e.target.id];
    if(errSel){ const name = e.target.value.trim(), msg = name ? validateName(name) : ''; if(msg) $(errSel).textContent = msg; }
  }));

  // komunikaty błędów są powiązane z polami dla czytników ekranu
  document.querySelectorAll('.field > .err').forEach(err=>{
    const input = err.parentElement.querySelector('input, select, textarea');
    err.setAttribute('role', 'alert');
    const sync = () => {
      const bad = err.textContent !== '';
      input.setAttribute('aria-invalid', String(bad));
      if(bad) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
    };
    new MutationObserver(sync).observe(err, {childList:true, characterData:true, subtree:true});
    sync();
  });

  FORMATS.forEach(f=>{ const o=document.createElement('option'); o.value=f.id; o.textContent=f.label; $('#d-format').appendChild(o); });

  document.querySelectorAll('.type-chip').forEach(b=>b.addEventListener('click',()=>{
    if(state.type===b.dataset.type && !state.editing) closeType(); else openType(b.dataset.type);
  }));
  document.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click', closeType));

  $('#f-person').addEventListener('submit', e=>{
    e.preventDefault(); clearErrors();
    const name = $('#p-name').value.trim();
    const err = validateName(name);
    if(err){ $('#p-name-err').textContent = err; $('#p-name').focus(); return; }
    upsert({type:state.type, name, gender:$('#p-gender').value, nat:$('#p-nat').value});
  });
  // formularze z samą nazwą i opcjonalnym polem: [formularz, pole nazwy, pole błędu, zbieranie reszty danych]
  [
    ['#f-photo', '#ph-name', '#ph-name-err', ()=>({type:'photo', format:$('#ph-format').value})],
    ['#f-vin', '#vin-name', '#vin-name-err', ()=>({type:'vin'})],
    ['#f-nip', '#nip-name', '#nip-name-err', ()=>({type:'nip', format:$('#nip-format').value})],
    ['#f-regon', '#rg-name', '#rg-name-err', ()=>({type:'regon', length:Number($('#rg-len').value)})]
  ].forEach(([form, nameSel, errSel, collect])=>{
    $(form).addEventListener('submit', e=>{
      e.preventDefault(); clearErrors();
      const name = $(nameSel).value.trim();
      const err = validateName(name);
      if(err){ $(errSel).textContent = err; $(nameSel).focus(); return; }
      upsert({name, ...collect()});
    });
  });
  $('#f-pesel').addEventListener('submit', e=>{
    e.preventDefault(); clearErrors();
    const name = $('#ps-name').value.trim();
    const err = validateName(name);
    if(err){ $('#ps-name-err').textContent = err; $('#ps-name').focus(); return; }
    const from = $('#ps-from').value, to = $('#ps-to').value;
    if(!from || !to){ $('#ps-range-err').textContent = 'Uzupełnij oba końce zakresu.'; return; }
    const y = s => Number(s.slice(0,4));
    if(y(from) < PESEL_MIN_YEAR || y(to) > PESEL_MAX_YEAR){ $('#ps-range-err').textContent = `PESEL obsługuje lata ${PESEL_MIN_YEAR}–${PESEL_MAX_YEAR}.`; return; }
    if(from > to){ $('#ps-range-err').textContent = 'Data „od” musi być wcześniejsza niż „do”.'; return; }
    upsert({type:'pesel', name, gender:$('#ps-gender').value, from, to});
  });
  $('#f-bool').addEventListener('submit', e=>{
    e.preventDefault(); clearErrors();
    const name = $('#b-name').value.trim();
    const err = validateName(name);
    if(err){ $('#b-name-err').textContent = err; $('#b-name').focus(); return; }
    const prob = Number($('#b-prob').value);
    if($('#b-prob').value.trim()==='' || !isFinite(prob) || prob<0 || prob>100){ $('#b-prob-err').textContent = 'Podaj liczbę od 0 do 100.'; return; }
    upsert({type:'bool', name, prob, as:$('#b-as').value});
  });
  $('#f-dict').addEventListener('submit', e=>{
    e.preventDefault(); clearErrors();
    const name = $('#x-name').value.trim();
    const err = validateName(name);
    if(err){ $('#x-name-err').textContent = err; $('#x-name').focus(); return; }
    const verr = msg => { $('#x-values-err').textContent = msg; $('#x-values').focus(); };
    let values;
    try{ values = JSON.parse($('#x-values').value); }
    catch(e){ return verr('To nie jest poprawny JSON. Wklej listę, np. ["A", "B"] albo [1, 2].'); }
    if(!Array.isArray(values)) return verr('Wklej listę w nawiasach kwadratowych [ ].');
    if(!values.length) return verr('Lista nie może być pusta.');
    const allStr = values.every(x=>typeof x==='string'), allNum = values.every(x=>typeof x==='number');
    if(!allStr && !allNum) return verr('Lista musi zawierać same teksty albo same liczby.');
    upsert({type:'dict', name, values});
  });
  $('#f-number').addEventListener('submit', e=>{
    e.preventDefault(); clearErrors();
    const name = $('#n-name').value.trim();
    const err = validateName(name);
    if(err){ $('#n-name-err').textContent = err; $('#n-name').focus(); return; }
    const min = $('#n-min').value.trim(), max = $('#n-max').value.trim(), dec = Number($('#n-dec').value);
    if(min==='' || max==='' || !isFinite(+min) || !isFinite(+max)){ $('#n-range-err').textContent = 'Podaj oba końce zakresu jako liczby.'; return; }
    if(+min > +max){ $('#n-range-err').textContent = 'Wartość „Od” musi być mniejsza lub równa „Do”.'; return; }
    if(dec===0 && Math.ceil(+min) > Math.floor(+max)){ $('#n-range-err').textContent = 'W tym zakresie nie ma liczby całkowitej.'; return; }
    upsert({type:'number', name, min:+min, max:+max, dec, as:$('#n-as').value});
  });
  $('#f-date').addEventListener('submit', e=>{
    e.preventDefault(); clearErrors();
    const name = $('#d-name').value.trim();
    const err = validateName(name);
    if(err){ $('#d-name-err').textContent = err; $('#d-name').focus(); return; }
    const from = $('#d-from').value, to = $('#d-to').value;
    if(!from || !to){ $('#d-range-err').textContent = 'Uzupełnij oba końce zakresu.'; return; }
    if(new Date(from) > new Date(to)){ $('#d-range-err').textContent = 'Data „Od” musi być wcześniejsza niż „Do”.'; return; }
    upsert({type:'date', name, from, to, format:$('#d-format').value});
  });
}
