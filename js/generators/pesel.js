import {rnd, p2} from './random.js';

const WEIGHTS = [1,3,7,9,1,3,7,9,1,3];
// offset miesiąca zależny od stulecia urodzenia
const MONTH_OFFSET = {18:80, 19:0, 20:20, 21:40, 22:60};

export function peselChecksum(digits){
  const sum = WEIGHTS.reduce((s,w,i)=>s + w*Number(digits[i]), 0);
  return (10 - sum % 10) % 10;
}

export const PESEL_MIN_YEAR = 1800, PESEL_MAX_YEAR = 2299;

// v.from / v.to: 'RRRR-MM-DD', v.gender: 'K' | 'M'
export function makePesel(v){
  const a = Date.parse(v.from+'T00:00:00Z'), b = Date.parse(v.to+'T00:00:00Z');
  const d = new Date(a + rnd(Math.floor((b-a)/86400000)+1)*86400000);
  const Y = d.getUTCFullYear();
  const month = d.getUTCMonth()+1 + MONTH_OFFSET[Math.floor(Y/100)];
  const serial = String(rnd(1000)).padStart(3,'0');
  const sex = rnd(5)*2 + (v.gender==='M' ? 1 : 0); // nieparzysta = mężczyzna
  const body = p2(Y%100) + p2(month) + p2(d.getUTCDate()) + serial + sex;
  return body + peselChecksum(body);
}
