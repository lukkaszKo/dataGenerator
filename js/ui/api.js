import {toast} from './toast.js';

export class ApiError extends Error {}

export async function api(method, url, body){
  let res;
  try{
    res = await fetch(url, {method, headers: body ? {'Content-Type':'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
  }catch(e){ throw new ApiError('Brak połączenia z serwerem. Uruchom aplikację poleceniem „npm start”.'); }
  const text = await res.text();
  let data = null; try{ data = JSON.parse(text); }catch(e){}
  if(data === null) throw new ApiError(`Ta strona nie działa przez serwer aplikacji (odpowiedź ${res.status}). Zatrzymaj inny serwer (np. Live Server), uruchom w folderze projektu „npm start” i otwórz http://localhost:3000.`);
  if(!res.ok) throw new ApiError(data.error || 'Błąd serwera (' + res.status + ').');
  return data;
}

export const qs = o => new URLSearchParams(Object.fromEntries(Object.entries(o).filter(([, v])=>v))).toString();
export const fail = e => toast(e instanceof ApiError ? e.message : 'Nieoczekiwany błąd: ' + e.message);
