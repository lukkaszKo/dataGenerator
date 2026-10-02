import {api, ApiError} from './api.js';

export const PHOTO_LIMIT = 100;   // maks. zdjęć na jedno generowanie (każde ma ok. 0,5 MB i jest pobierane z cudzego serwisu)
const CONCURRENCY = 3;           // tyle zdjęć naraz — nie obciążamy serwisu

// pobiera `count` zdjęć; onProgress(done, count) po każdym; przy błędzie przerywa i rzuca ApiError
export async function fetchPhotos(count, onProgress){
  const out = new Array(count);
  let next = 0, done = 0, failure = null;
  async function worker(){
    while(!failure && next < count){
      const i = next++;
      try{ out[i] = await api('GET', '/api/photo'); }
      catch(e){ failure = e instanceof ApiError ? e : new ApiError('Nie udało się pobrać zdjęcia: ' + e.message); return; }
      onProgress?.(++done, count);
    }
  }
  await Promise.all(Array.from({length:Math.min(CONCURRENCY, count)}, worker));
  if(failure) throw failure;
  return out;
}
