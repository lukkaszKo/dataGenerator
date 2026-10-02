import {makeFirstName, makeSurname} from './person.js';
import {randomDate} from './date.js';
import {makeNumber} from './number.js';
import {makeDict, makeBool} from './misc.js';
import {makePesel} from './pesel.js';
import {makePhoto} from './photo.js';
import {makeVin} from './vin.js';
import {makeNip, makeRegon} from './company.js';

// rejestr typów zmiennych: etykieta w UI + funkcja generująca wartość
export const TYPES = {
  person:  {label:'IMIĘ',     make:makeFirstName},
  surname: {label:'NAZWISKO', make:makeSurname},
  pesel:   {label:'PESEL',    make:makePesel},
  photo:   {label:'ZDJĘCIE',  make:makePhoto},
  vin:     {label:'VIN',      make:makeVin},
  nip:     {label:'NIP',      make:makeNip},
  regon:   {label:'REGON',    make:makeRegon},
  date:    {label:'DATA',     make:randomDate},
  number:  {label:'NUMER',    make:makeNumber},
  dict:    {label:'SŁOWNIK',  make:makeDict},
  bool:    {label:'BOOLEAN',  make:makeBool}
};

export const GROUPS = [
  {label:'Osoba', types:['person','surname','pesel','photo']},
  {label:'Uniwersalne', types:['date','number','dict','bool']},
  {label:'Pojazd', types:['vin']},
  {label:'Podmiot', types:['nip','regon']}
];

export const isPersonType = t => t==='person' || t==='surname';

export const generate = v => TYPES[v.type].make(v);
