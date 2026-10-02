import {rnd, pick} from './random.js';

const digits = n => Array.from({length:n}, ()=>rnd(10));

const NIP_WEIGHTS = [6,5,7,2,3,4,5,6,7];
const REGON9_WEIGHTS = [8,9,2,3,4,5,6,7];
const REGON14_WEIGHTS = [2,4,8,5,0,9,7,3,6,1,2,4,8];

const weighted = (d, w) => d.reduce((s,x,i)=>s + x*w[i], 0);

export function nipChecksum(d){ return weighted(d, NIP_WEIGHTS) % 11; } // 10 = numer niedozwolony
export const regon9Checksum = d => weighted(d, REGON9_WEIGHTS) % 11 % 10;
export const regon14Checksum = d => weighted(d, REGON14_WEIGHTS) % 11 % 10;

// v.format: 'plain' | 'dashes' (XXX-XXX-XX-XX)
export function makeNip(v){
  for(;;){
    const d = [1+rnd(9), ...digits(8)]; // pierwsze cyfry to kod urzędu skarbowego — bez zera na początku
    const c = nipChecksum(d);
    if(c===10) continue;
    const s = [...d, c].join('');
    return v.format==='dashes' ? `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6,8)}-${s.slice(8)}` : s;
  }
}

// v.length: 9 | 14; pierwsze dwie cyfry to kod województwa (02, 04 … 32)
export function makeRegon(v){
  const voivodeship = String(2*(1+rnd(16))).padStart(2,'0');
  const d9 = [...voivodeship].map(Number).concat(digits(6));
  d9.push(regon9Checksum(d9));
  if(Number(v.length)!==14) return d9.join('');
  const d14 = d9.concat(digits(4));
  d14.push(regon14Checksum(d14));
  return d14.join('');
}
