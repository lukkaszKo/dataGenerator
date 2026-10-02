import {rnd, p2} from './random.js';

export const FORMATS = [
  {id:'YYYYMMDD', label:'RRRRMMDD'},
  {id:'YYYY-MM-DD', label:'RRRR-MM-DD'},
  {id:'YYYY.MM.DD', label:'RRRR.MM.DD'},
  {id:'YYYY-MM-DDTHH:mm:ss', label:'RRRR-MM-DDTgg:mm:ss'},
  {id:'DDMMYYYY', label:'DDMMRRRR'},
  {id:'DD-MM-YYYY', label:'DD-MM-RRRR'},
  {id:'DD.MM.YYYY', label:'DD.MM.RRRR'}
];

export function fmtDate(d, f){
  const Y=d.getFullYear(), M=p2(d.getMonth()+1), D=p2(d.getDate()),
        h=p2(d.getHours()), m=p2(d.getMinutes()), s=p2(d.getSeconds());
  switch(f){
    case 'YYYYMMDD': return `${Y}${M}${D}`;
    case 'YYYY-MM-DD': return `${Y}-${M}-${D}`;
    case 'YYYY.MM.DD': return `${Y}.${M}.${D}`;
    case 'YYYY-MM-DDTHH:mm:ss': return `${Y}-${M}-${D}T${h}:${m}:${s}`;
    case 'DDMMYYYY': return `${D}${M}${Y}`;
    case 'DD-MM-YYYY': return `${D}-${M}-${Y}`;
    case 'DD.MM.YYYY': return `${D}.${M}.${Y}`;
  }
  return d.toISOString();
}

export function randomDate(v){
  const a=new Date(v.from).getTime(), b=new Date(v.to).getTime();
  const steps = Math.floor((b-a)/1000);
  return fmtDate(new Date(a + rnd(steps+1)*1000), v.format);
}
