import {$, tpl} from './dom.js';
import {SAMPLE_JSON} from './data/sample.js';

export const state = { vars: [], type: null, editing: null };

let uid = 0;
export const newId = () => 'v'+Date.now().toString(36)+(uid++);

export const snapshot = () => ({vars: structuredClone(state.vars), tpl: tpl.value, count: $('#count').value});

/* ---------- „niezapisane zmiany”: porównanie bieżącego stanu z ostatnio zapisanym/załadowanym ---------- */
const subs = [];
export const onChange = fn => subs.push(fn);
export const notifyChange = () => subs.forEach(fn=>fn());

const key = () => JSON.stringify([state.vars, tpl.value, String($('#count').value)]);
let baseline = null;
export const getBaseline = () => baseline;
export const setBaseline = b => { baseline = b; notifyChange(); };
export const markClean = () => setBaseline(key());
export const isDirty = () => baseline !== null && key() !== baseline;

// start aplikacji: brak zmiennych, w szablonie przykładowy JSON (jak po „Generuj przykładowy JSON”)
export function startEmpty(){
  state.vars = [];
  tpl.value = JSON.stringify(SAMPLE_JSON, null, 2);
}
