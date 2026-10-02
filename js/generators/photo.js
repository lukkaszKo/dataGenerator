// zdjęcie jest pobierane z sieci (asynchronicznie, przez serwer), więc generator synchroniczny go nie zna;
// output.js pobiera zdjęcia z góry i wstawia gotowe wartości przez photoValue()

// v.format: 'base64' (sam ciąg) | 'datauri' (data:image/jpeg;base64,...)
export const photoValue = (v, photo) => v.format==='datauri' ? `data:${photo.mime};base64,${photo.base64}` : photo.base64;

export function makePhoto(){
  throw new Error('Zdjęcie jest pobierane z sieci przed wypełnieniem szablonu.');
}
