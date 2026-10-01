import { buildDailyQueue, type DailyQueue, type QueueInput } from '../domain/queue';
import { createScheduler, State } from '../domain/scheduler';
import { computeStreak, countedDays, lastSevenDays, type StreakInfo, type WeekDay } from '../domain/streak';
import { studyDayEnd, studyDayKey, studyDayStart } from '../domain/studyDay';
import type { Deck } from '../domain/types';
import { listActiveCards } from './cards';
import { db } from './db';
import { listDecks } from './decks';
import { logsBetween } from './reviews';
import { getSettings } from './settings';

const DAY_MS = 86_400_000;
export const BACKUP_INTERVAL_MS = 7 * DAY_MS;
export const BACKUP_MIN_CARDS = 20;

export interface DeckOverview {
  deck: Deck;
  total: number;
  dueToday: number;
}

export interface TodayOverview {
  queue: DailyQueue;
  decks: DeckOverview[];
  streak: StreakInfo;
  backupDue: boolean;
  onboarded: boolean;
}

async function todayContext(now: number): Promise<Omit<QueueInput, 'cards' | 'extraNew'>> {
  const settings = await getSettings();
  const scheduler = createScheduler(settings.desiredRetention);
  const logs = await logsBetween(studyDayStart(now, settings.dayStartHour), studyDayEnd(now, settings.dayStartHour));
  const newStudiedToday = logs.filter((l) => l.prevFsrs.state === State.New).length;
  return {
    now,
    settings,
    newStudiedToday,
    reviewsDoneToday: logs.length - newStudiedToday,
    retrievability: scheduler.retrievability,
  };
}

export async function getStudyQueue(
  now: number,
  opts: { deckId?: string; extraNew?: number } = {},
): Promise<DailyQueue> {
  const [ctx, all] = await Promise.all([todayContext(now), listActiveCards()]);
  const cards = opts.deckId ? all.filter((c) => c.deckId === opts.deckId) : all;
  return buildDailyQueue({ ...ctx, cards, extraNew: opts.extraNew });
}

export async function getStreak(now: number): Promise<{ streak: StreakInfo; week: WeekDay[] }> {
  const settings = await getSettings();
  const [logs, completed] = await Promise.all([db.reviewLogs.toArray(), db.completedDays.toArray()]);
  const perDay = new Map<string, number>();
  for (const l of logs) {
    const key = studyDayKey(l.reviewedAt, settings.dayStartHour);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const counted = countedDays(perDay, completed.map((c) => c.day));
  const today = studyDayKey(now, settings.dayStartHour);
  return { streak: computeStreak(counted, today), week: lastSevenDays(counted, today) };
}

export async function getTodayOverview(now: number): Promise<TodayOverview> {
  const [ctx, decks, cards, { streak }] = await Promise.all([
    todayContext(now),
    listDecks(),
    listActiveCards(),
    getStreak(now),
  ]);
  const queue = buildDailyQueue({ ...ctx, cards });
  const deckOverviews = decks.map((deck) => {
    const deckCards = cards.filter((c) => c.deckId === deck.id);
    return { deck, total: deckCards.length, dueToday: buildDailyQueue({ ...ctx, cards: deckCards }).cards.length };
  });
  const { lastExportAt, onboardedAt } = ctx.settings;
  const backupDue =
    cards.length >= BACKUP_MIN_CARDS && (lastExportAt === undefined || now - lastExportAt > BACKUP_INTERVAL_MS);
  return { queue, decks: deckOverviews, streak, backupDue, onboarded: onboardedAt !== undefined };
}

export async function markDayCompleted(now: number): Promise<void> {
  const settings = await getSettings();
  await db.completedDays.put({ day: studyDayKey(now, settings.dayStartHour) });
}

export async function forecastTomorrow(now: number): Promise<number> {
  const settings = await getSettings();
  const tomorrow = studyDayEnd(now, settings.dayStartHour) + 3_600_000;
  const scheduler = createScheduler(settings.desiredRetention);
  const cards = await listActiveCards();
  return buildDailyQueue({
    cards,
    now: tomorrow,
    settings,
    newStudiedToday: 0,
    reviewsDoneToday: 0,
    retrievability: scheduler.retrievability,
  }).cards.length;
}
