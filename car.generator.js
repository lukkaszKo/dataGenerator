import { getRandomLetter } from "./letter.generator.js";
export function getLicensePlateNumber() {
  const letters = `${getRandomLetter()}${getRandomLetter()}${getRandomLetter()}${getRandomLetter()}`;
  const numbers = `${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}`;
  return `${letters}${numbers}`;
}

const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"; // bez I, O, Q — niedozwolone w VIN

const TRANSLITERATION = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

function transliterate(char) {
  if (/[0-9]/.test(char)) return Number(char);
  return TRANSLITERATION[char];
}

function getRandomChar() {
  const index = Math.floor(Math.random() * VIN_CHARS.length);
  return VIN_CHARS[index];
}

function calculateCheckDigit(vinWithoutCheckDigit) {
  let sum = 0;
  for (let i = 0; i < vinWithoutCheckDigit.length; i++) {
    sum += transliterate(vinWithoutCheckDigit[i]) * WEIGHTS[i];
  }
  const remainder = sum % 11;
  return remainder === 10 ? "X" : String(remainder);
}

export function getRandomVin() {
  // Generujemy 17 znaków, pozycja 9 (indeks 8) to cyfra kontrolna — na razie placeholder
  let vinChars = [];
  for (let i = 0; i < 17; i++) {
    vinChars.push(i === 8 ? "0" : getRandomChar());
  }

  const checkDigit = calculateCheckDigit(vinChars.join(""));
  vinChars[8] = checkDigit;

  return vinChars.join("");
}
console.log(getRandomVin());
