import {pick} from './random.js';

const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'; // bez I, O, Q — niedozwolone w VIN
const TRANSLITERATION = {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9};
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];

const value = c => /[0-9]/.test(c) ? Number(c) : TRANSLITERATION[c];

export function vinCheckDigit(vin){
  const sum = [...vin].reduce((s,c,i)=>s + value(c)*WEIGHTS[i], 0);
  const r = sum % 11;
  return r===10 ? 'X' : String(r);
}

export function makeVin(){
  const chars = Array.from({length:17}, (_, i)=> i===8 ? '0' : pick([...VIN_CHARS]));
  chars[8] = vinCheckDigit(chars.join(''));
  return chars.join('');
}
