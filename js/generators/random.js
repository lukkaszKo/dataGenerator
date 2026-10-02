export const rnd = n => Math.floor(Math.random()*n);
export const pick = a => a[rnd(a.length)];
export const p2 = n => String(n).padStart(2,'0');
