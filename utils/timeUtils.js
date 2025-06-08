export function getCurrentTime() {
  return new Date().getTime();
}

export function getTimeDiff(start, end) {
  return Math.floor((end - start) / 1000);
}