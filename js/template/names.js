// podpowiedzi nazw zmiennych (czysta logika, bez DOM)
const BASES = {person:'imie', surname:'nazwisko', pesel:'pesel', photo:'zdjecie', vin:'vin', nip:'nip', regon:'regon', date:'data', number:'liczba', dict:'slownik', bool:'flaga'};

// pierwsza wolna nazwa w postaci <baza>_<n>, np. imie_1, imie_2
export function suggestName(type, vars){
  const taken = new Set(vars.map(v=>v.name)), base = BASES[type] || 'zmienna';
  for(let n=1;; n++){ const c = `${base}_${n}`; if(!taken.has(c)) return c; }
}

// nazwa kopii: kwota → kwota_2, kwota_2 → kwota_3 (pomija zajęte)
export function copyName(name, vars){
  const m = /^(.*?)(?:_(\d+))?$/.exec(name), base = m[1] || name, taken = new Set(vars.map(v=>v.name));
  for(let n = Number(m[2] || 1) + 1;; n++){ const c = `${base}_${n}`; if(!taken.has(c)) return c; }
}
