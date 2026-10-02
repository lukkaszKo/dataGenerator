// Historia zapisuje wyniki na dysku: zdjęcia base64 (ok. 0,7 MB sztuka) rozpychałyby ją do setek MB,
// więc długie napisy skracamy do początku z adnotacją, ile znaków pominięto.
export const LONG_STRING = 2000;

export function shrinkLongStrings(value, max = LONG_STRING){
  let truncated = false;
  const walk = v => {
    if(typeof v === 'string' && v.length > max){ truncated = true; return `${v.slice(0, 40)}…[skrócono, ${v.length} znaków]`; }
    if(Array.isArray(v)) return v.map(walk);
    if(v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x])=>[k, walk(x)]));
    return v;
  };
  const output = walk(value);
  return {output, truncated};
}
