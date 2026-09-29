import { addDays, weekKey } from './studyDay';

export const MIN_CARDS_FOR_DAY = 10;

export interface StreakInfo {
  days: number;
  freezeAvailable: boolean;
  countedToday: boolean;
}

export type DayStatus = 'done' | 'missed' | 'today';

export interface WeekDay {
  key: string;
  status: DayStatus;
}

export function countedDays(reviewsPerDay: Map<string, number>, completedDays: Iterable<string>): Set<string> {
  const counted = new Set(completedDays);
  for (const [day, n] of reviewsPerDay) if (n >= MIN_CARDS_FOR_DAY) counted.add(day);
  return counted;
}

export function computeStreak(counted: Set<string>, today: string): StreakInfo {
  const countedToday = counted.has(today);
  if (counted.size === 0) return { days: 0, freezeAvailable: true, countedToday };
  const earliest = [...counted].sort()[0];
  const usedFreeze = new Set<string>();
  let days = 0;
  let cursor = countedToday ? today : addDays(today, -1);
  while (cursor >= earliest) {
    if (counted.has(cursor)) {
      days++;
    } else {
      const week = weekKey(cursor);
      if (usedFreeze.has(week)) break;
      usedFreeze.add(week);
    }
    cursor = addDays(cursor, -1);
  }
  return { days, freezeAvailable: !usedFreeze.has(weekKey(today)), countedToday };
}

export function lastSevenDays(counted: Set<string>, today: string): WeekDay[] {
  const out: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = addDays(today, -i);
    const status: DayStatus = counted.has(key) ? 'done' : key === today ? 'today' : 'missed';
    out.push({ key, status });
  }
  return out;
}
