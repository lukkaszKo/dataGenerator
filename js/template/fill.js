import {generate} from '../generators/index.js';
import {PH_RE} from './parse.js';

export class GenError extends Error{}

function resolve(name, field, ctx, vars){
  const v = vars.find(x=>x.name===name);
  if(!v) throw new GenError(`Nieznana zmienna {{${name}}}. Dodaj ją albo popraw nazwę.`);
  if(field) throw new GenError(`Zmienna {{${name}}} zwraca jedną wartość i nie ma pól. Użyj samego {{${name}}}.`);
  if(!(name in ctx)) ctx[name] = generate(v);
  return ctx[name];
}

// ctx pamięta wartości w obrębie jednego rekordu: ta sama zmienna = ta sama wartość
export function fill(node, ctx, vars){
  if(typeof node==='string'){
    const whole = /^\{\{\s*([A-Za-z_]\w*)(?:\.([A-Za-z_]\w*))?\s*\}\}$/.exec(node);
    if(whole) return resolve(whole[1], whole[2], ctx, vars); // samodzielny placeholder zachowuje typ (np. liczba)
    return node.replace(PH_RE, (m,n,f)=>String(resolve(n,f,ctx,vars)));
  }
  if(Array.isArray(node)) return node.map(x=>fill(x,ctx,vars));
  if(node && typeof node==='object'){ const o={}; for(const k of Object.keys(node)) o[fill(k,ctx,vars)] = fill(node[k],ctx,vars); return o; }
  return node;
}
