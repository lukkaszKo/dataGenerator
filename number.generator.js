export function getRandomIntiger(numberFrom, numberTo) {
  if (!Number.isInteger(numberFrom) || !Number.isInteger(numberTo)) {
    throw new Error(
      `Wrong data type yearFrom: ${typeof yearFrom} and yearTo: ${typeof yearTo}. Expected number type in both.`,
    );
  }
  if (numberFrom > numberTo) {
    throw new Error("yearFrom is larger then yearTo");
  }
  const selectedInt = Math.floor(
    numberFrom + Math.random() * (numberFrom - numberTo),
  );
  return selectedInt;
}
