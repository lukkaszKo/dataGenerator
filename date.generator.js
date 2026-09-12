function getRandomDate(yearFrom, yearTo) {
  if (!Number.isInteger(yearFrom) || !Number.isInteger(yearTo)) {
    throw new Error(
      `Wrong data type yearFrom: ${typeof yearFrom} and yearTo: ${typeof yearTo}. Expected number type in both.`,
    );
  }
  if (yearFrom > yearTo) {
    throw new Error("yearFrom is larger then yearTo");
  }
  if (yearFrom < 1970) {
    throw new Error("Range only from 1970-01-01");
  }
  const timeFrom = new Date(`${yearFrom}-01-01T00:00:00.000`).getTime();
  const timeTo = new Date(`${yearTo + 1}-01-01T00:00:00.000`).getTime();
  const selectedDate = new Date(timeFrom + Math.random() * (timeTo - timeFrom));
  return selectedDate;
}
