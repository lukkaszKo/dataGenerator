import { getRandomLetter } from "./letter.generator.js";
import { getRandomIntiger } from "./number.generator.js";
export function getIdCard() {
  const letters = `${getRandomLetter()}${getRandomLetter()}${getRandomLetter()}`;
  const numbers = `${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}`;
  return `${letters}${numbers}`;
}

export function getPassport() {
  const letters = `${getRandomLetter()}${getRandomLetter()}`;
  const numbers = `${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}${getRandomIntiger(1, 9)}`;
  return `${letters}${numbers}`;
}
