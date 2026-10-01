import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  State,
  type Card as FsrsCard,
  type Grade,
} from 'ts-fsrs';
import type { Rating } from './types';

export { State };

/** Estado FSRS guardado no banco: igual ao Card do ts-fsrs, com datas em ms. */
export type FsrsState = Omit<FsrsCard, 'due' | 'last_review'> & { due: number; last_review?: number };

export interface Scheduler {
  preview(s: FsrsState, now: number): Record<Rating, number>;
  answer(s: FsrsState, rating: Rating, now: number): FsrsState;
  retrievability(s: FsrsState, now: number): number;
}

function toFsrs(s: FsrsState): FsrsCard {
  const { due, last_review, ...rest } = s;
  return {
    ...rest,
    due: new Date(due),
    ...(last_review !== undefined ? { last_review: new Date(last_review) } : {}),
  } as FsrsCard;
}

function fromFsrs(c: FsrsCard): FsrsState {
  const { due, last_review, ...rest } = c;
  const state: FsrsState = { ...rest, due: new Date(due).getTime() };
  if (last_review) state.last_review = new Date(last_review).getTime();
  return state;
}

export function newFsrsState(now: number): FsrsState {
  return fromFsrs(createEmptyCard(new Date(now)));
}

export function isNew(s: FsrsState): boolean {
  return s.state === State.New;
}

export function isLearning(s: FsrsState): boolean {
  return s.state === State.Learning || s.state === State.Relearning;
}

const RATINGS: Rating[] = [1, 2, 3, 4];

export function createScheduler(desiredRetention: number, enableFuzz = true): Scheduler {
  const f = fsrs(generatorParameters({ request_retention: desiredRetention, enable_fuzz: enableFuzz }));
  return {
    preview(s, now) {
      const p = f.repeat(toFsrs(s), new Date(now));
      const out = {} as Record<Rating, number>;
      for (const r of RATINGS) out[r] = p[r as Grade].card.due.getTime();
      return out;
    },
    answer(s, rating, now) {
      return fromFsrs(f.next(toFsrs(s), new Date(now), rating as Grade).card);
    },
    retrievability(s, now) {
      if (isNew(s)) return 0;
      return f.get_retrievability(toFsrs(s), new Date(now), false);
    },
  };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatInterval(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MIN))} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  const days = ms / DAY;
  if (days < 30) return `${Math.round(days)} d`;
  if (days < 365) return `${Math.round(days / 30)} m`;
  return `${(days / 365).toFixed(1).replace('.', ',')} a`;
}
