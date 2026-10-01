function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function studyDayStart(now: number, startHour: number): number {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour);
  if (now < start.getTime()) start.setDate(start.getDate() - 1);
  return start.getTime();
}

export function studyDayEnd(now: number, startHour: number): number {
  const end = new Date(studyDayStart(now, startHour));
  end.setDate(end.getDate() + 1);
  return end.getTime();
}

export function studyDayKey(now: number, startHour: number): string {
  return formatDayKey(new Date(studyDayStart(now, startHour)));
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return formatDayKey(d);
}

export function weekKey(key: string): string {
  const d = parseDayKey(key);
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return formatDayKey(d);
}
