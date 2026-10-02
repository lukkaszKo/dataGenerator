export function getRandomTimestamp(dateFrom, dateTo) {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(dateFrom) || !datePattern.test(dateTo)) {
    throw new Error(
      `Wrong date format dateFrom: ${dateFrom} and dateTo: ${dateTo}. Expected YYYY-MM-DD in both.`,
    );
  }
  const timeFrom = new Date(`${dateFrom}T00:00:00.000`).getTime();
  const timeTo = new Date(`${dateTo}T23:59:59.000`).getTime();
  if (Number.isNaN(timeFrom) || Number.isNaN(timeTo)) {
    throw new Error("Invalid date value");
  }
  if (timeFrom > timeTo) {
    throw new Error("dateFrom is larger then dateTo");
  }
  const seconds = Math.floor(Math.random() * ((timeTo - timeFrom) / 1000 + 1));
  return timeFrom + seconds * 1000;
}

function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

function assertTimestamp(timestamp) {
  if (!Number.isFinite(timestamp)) {
    throw new Error(
      `Wrong data type timestamp: ${typeof timestamp}. Expected finite number.`,
    );
  }
  return new Date(timestamp);
}

export function formatTimestampToDate(timestamp) {
  const date = assertTimestamp(timestamp);
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}
export function formatTimestampToDateTime(timestamp) {
  const date = assertTimestamp(timestamp);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return `${formatTimestampToDate(timestamp)}T${time}`;
}

export function formatTimestampToDateTimeWidthMilisecond(timestamp) {
  const date = assertTimestamp(timestamp);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  return `${formatTimestampToDate(timestamp)}T${time}`;
}
const test = getRandomTimestamp("2000-01-02", "2000-03-04");
console.log(formatTimestampToDate(test));
console.log(formatTimestampToDateTime(test));
console.log(formatTimestampToDateTimeWidthMilisecond(test));
