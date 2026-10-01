import { isNew, type FsrsState } from './scheduler';
import { studyDayEnd } from './studyDay';
import type { Card, Settings } from './types';

export const SECONDS_PER_CARD = 8;
export const NEW_EVERY = 4;

export interface QueueInput {
  cards: Card[];
  now: number;
  settings: Settings;
  newStudiedToday: number;
  reviewsDoneToday: number;
  extraNew?: number;
  retrievability: (s: FsrsState, now: number) => number;
}

export interface DailyQueue {
  cards: Card[];
  reviewCount: number;
  newCount: number;
  /** Revisões vencidas que ficaram de fora por causa do limite diário. */
  backlog: number;
  estimatedMinutes: number;
}

export function reviewCap(minutesPerDay: number): number {
  return Math.floor((minutesPerDay * 60) / SECONDS_PER_CARD);
}

export function interleave<T>(reviews: T[], news: T[], every: number): T[] {
  const out: T[] = [];
  let n = 0;
  reviews.forEach((r, i) => {
    out.push(r);
    if ((i + 1) % every === 0 && n < news.length) out.push(news[n++]);
  });
  while (n < news.length) out.push(news[n++]);
  return out;
}

export function buildDailyQueue(input: QueueInput): DailyQueue {
  const { cards, now, settings, newStudiedToday, reviewsDoneToday, extraNew = 0, retrievability } = input;
  const end = studyDayEnd(now, settings.dayStartHour);
  const active = cards.filter((c) => c.deletedAt === undefined);

  const dueReviews = active
    .filter((c) => !isNew(c.fsrs) && c.fsrs.due < end)
    .map((c) => ({ c, r: retrievability(c.fsrs, now) }))
    .sort((a, b) => a.r - b.r || a.c.fsrs.due - b.c.fsrs.due)
    .map((x) => x.c);

  const cap = Math.max(0, reviewCap(settings.minutesPerDay) - reviewsDoneToday);
  const reviews = dueReviews.slice(0, cap);
  const backlog = dueReviews.length - reviews.length;

  const regularNew = backlog > 0 ? 0 : Math.max(0, settings.newPerDay - newStudiedToday);
  const news = active
    .filter((c) => isNew(c.fsrs))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, regularNew + extraNew);

  const mixed = interleave(reviews, news, NEW_EVERY);
  return {
    cards: mixed,
    reviewCount: reviews.length,
    newCount: news.length,
    backlog,
    estimatedMinutes: Math.ceil((mixed.length * SECONDS_PER_CARD) / 60),
  };
}
