import {pick} from './random.js';

export const makeDict = v => pick(v.values);

export function makeBool(v){
  const b = Math.random()*100 < v.prob;
  return v.as==='bool' ? b : String(b);
}
