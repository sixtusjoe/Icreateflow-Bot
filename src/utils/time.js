export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0)   return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function parseMinutes(value) {
  if (typeof value === 'number') return value;
  const match = String(value).match(/^(\d+)([hm]?)$/);
  if (!match) return NaN;
  const n = parseInt(match[1], 10);
  return match[2] === 'h' ? n * 60 : n;
}

export function unixNow() {
  return Date.now();
}
