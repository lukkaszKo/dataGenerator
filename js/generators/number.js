export function makeNumber(v){
  const a = Number(v.min), b = Number(v.max), dec = Number(v.dec)||0;
  let text;
  if(dec===0){ const lo=Math.ceil(a), hi=Math.floor(b); text = String(lo + Math.floor(Math.random()*(hi-lo+1))); }
  else text = (a + Math.random()*(b-a)).toFixed(dec);
  return v.as==='num' ? Number(text) : text;
}
