import {NAMES, SURNAMES} from '../data/names.js';
import {pick} from './random.js';

export function makeFirstName(v){
  const d = NAMES[v.nat] || NAMES.PL;
  return pick(v.gender==='K' ? d.f : d.m);
}

export function makeSurname(v){
  const s = pick(SURNAMES[v.nat] || SURNAMES.PL);
  return Array.isArray(s) ? (v.gender==='K' ? s[1] : s[0]) : s;
}
