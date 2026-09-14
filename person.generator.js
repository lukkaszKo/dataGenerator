import { fakerPL as faker } from "@faker-js/faker";

export function getmaleName() {
  return faker.person.firstName("male");
}

export function getmaleSurname() {
  return faker.person.lastName("male");
}

console.log(getmaleName(), getmaleSurname());
