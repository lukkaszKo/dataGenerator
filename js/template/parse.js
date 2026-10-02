/* placeholdery poza cudzysłowem (np. "wiek": {{wiek}}) zamieniamy na stringi */
export function quoteBare(t){
  let out='', inS=false;
  for(let i=0;i<t.length;i++){
    const c=t[i];
    if(inS){ out+=c; if(c==='\\'){ out+=(t[i+1]??''); i++; } else if(c==='"') inS=false; continue; }
    if(c==='"'){ inS=true; out+=c; continue; }
    if(c==='{' && t[i+1]==='{'){ const j=t.indexOf('}}',i); if(j>0){ out+='"'+t.slice(i,j+2)+'"'; i=j+1; continue; } }
    out+=c;
  }
  return out;
}

export const parseTemplate = text => JSON.parse(quoteBare(text));

export function jsonErrorText(err, src){
  const m = /position (\d+)/.exec(err.message);
  if(m){
    const pos=+m[1];
    // przecinek tuż przed } lub ] — parser zgłasza błąd dopiero na zamknięciu, więc wskazujemy sam przecinek
    const comma = src.slice(0,pos).search(/,\s*$/);
    if(comma>=0 && /^[}\]]/.test(src.slice(pos))){
      const b=src.slice(0,comma);
      return `Nadmiarowy przecinek w linii ${b.split('\n').length}, kolumnie ${comma-b.lastIndexOf('\n')} — usuń go przed zamknięciem „${src[pos]}”.`;
    }
    const before=src.slice(0,pos); const line=before.split('\n').length; const col=pos-before.lastIndexOf('\n'); return `Błąd JSON w linii ${line}, kolumnie ${col}.`; }
  const lc = /line (\d+) column (\d+)/.exec(err.message);
  if(lc) return `Błąd JSON w linii ${lc[1]}, kolumnie ${lc[2]}.`;
  return 'Błąd JSON: ' + err.message;
}

export const PH_RE = /\{\{\s*([A-Za-z_]\w*)(?:\.([A-Za-z_]\w*))?\s*\}\}/g;

export function usedTokens(text){
  const out=[]; let m; PH_RE.lastIndex=0;
  while((m=PH_RE.exec(text))) out.push({name:m[1], field:m[2]});
  return out;
}

export function inStringAt(text, pos){
  let inS=false;
  for(let i=0;i<pos;i++){
    const c=text[i];
    if(inS){ if(c==='\\') i++; else if(c==='"') inS=false; }
    else if(c==='"') inS=true;
  }
  return inS;
}
