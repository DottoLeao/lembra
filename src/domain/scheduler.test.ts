import { describe, expect, it } from 'vitest';
import { createScheduler, formatInterval, isLearning, isNew, newFsrsState, State } from './scheduler';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = new Date(2026, 8, 29, 10).getTime();
const sched = createScheduler(0.9, false);

describe('scheduler', () => {
  it('card novo começa como New e vence agora', () => {
    const s = newFsrsState(now);
    expect(isNew(s)).toBe(true);
    expect(s.due).toBe(now);
  });

  it('prévia de card novo: Errei < Bom < Fácil, e Fácil leva pelo menos 1 dia', () => {
    const p = sched.preview(newFsrsState(now), now);
    expect(p[1]).toBeLessThan(p[3]);
    expect(p[3]).toBeLessThan(p[4]);
    expect(p[4] - now).toBeGreaterThanOrEqual(DAY);
  });

  it('responder Bom num card novo conta uma repetição e sai de New', () => {
    const s = sched.answer(newFsrsState(now), 3, now);
    expect(s.reps).toBe(1);
    expect(isNew(s)).toBe(false);
    expect(s.last_review).toBe(now);
  });

  it('Errei num card em revisão conta um lapso e volta em menos de 1 hora', () => {
    const review = sched.answer(newFsrsState(now), 4, now);
    expect(review.state).toBe(State.Review);
    const t = review.due;
    const lapsed = sched.answer(review, 1, t);
    expect(lapsed.lapses).toBe(1);
    expect(isLearning(lapsed)).toBe(true);
    expect(lapsed.due - t).toBeLessThanOrEqual(HOUR);
  });

  it('a chance de lembrar cai com o tempo; card novo tem 0', () => {
    const review = sched.answer(newFsrsState(now), 4, now);
    const r1 = sched.retrievability(review, review.due);
    const r2 = sched.retrievability(review, review.due + 30 * DAY);
    expect(r1).toBeGreaterThan(r2);
    expect(sched.retrievability(newFsrsState(now), now)).toBe(0);
  });

  it('formata intervalos em português', () => {
    expect(formatInterval(30_000)).toBe('1 min');
    expect(formatInterval(10 * MIN)).toBe('10 min');
    expect(formatInterval(3 * HOUR)).toBe('3 h');
    expect(formatInterval(DAY)).toBe('1 d');
    expect(formatInterval(3 * DAY)).toBe('3 d');
    expect(formatInterval(45 * DAY)).toBe('2 m');
    expect(formatInterval(400 * DAY)).toBe('1,1 a');
  });
});
