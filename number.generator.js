export function getRandomIntiger(numberFrom, numberTo) {
  if (!Number.isInteger(numberFrom) || !Number.isInteger(numberTo)) {
    throw new Error(
      `Wrong data type yearFrom: ${typeof numberFrom} and yearTo: ${typeof numberTo}. Expected number type in both.`,
    );
  }
  if (numberFrom > numberTo) {
    throw new Error("numberFrom is larger than numberTo");
  }
  const selectedInt = Math.floor(
    numberFrom + Math.random() * (numberTo - numberFrom + 1),
  );
  return selectedInt;
}
