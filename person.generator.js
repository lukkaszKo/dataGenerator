import { fakerPL as faker } from "@faker-js/faker";

export function getName() {
  return faker.person.firstName();
}

export function getSurname() {
  return faker.person.lastName();
}
