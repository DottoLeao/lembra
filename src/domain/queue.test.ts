import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import { buildDailyQueue, interleave, reviewCap, type QueueInput } from './queue';
import { State, type FsrsState } from './scheduler';
import { studyDayEnd } from './studyDay';
import { DEFAULT_SETTINGS, type Card } from './types';

const now = new Date(2026, 8, 29, 10).getTime();
const end = studyDayEnd(now, 4);
const HOUR = 3_600_000;

// Nos testes, a "chance de lembrar" é a própria stability, para controlar a ordem.
const fakeR = (s: FsrsState) => s.stability;

const review = (id: string, r: number, due = now - HOUR) =>
  makeCard(id, { state: State.Review, due, stability: r });
const fresh = (id: string, createdAt: number) => makeCard(id, {}, { createdAt });

function run(cards: Card[], over: Partial<QueueInput> = {}) {
  return buildDailyQueue({
    cards,
    now,
    settings: { ...DEFAULT_SETTINGS, minutesPerDay: 1, newPerDay: 3 }, // limite = 7 revisões
    newStudiedToday: 0,
    reviewsDoneToday: 0,
    retrievability: fakeR,
    ...over,
  });
}

describe('buildDailyQueue', () => {
  it('limite de revisões vem dos minutos por dia (8 s por card)', () => {
    expect(reviewCap(10)).toBe(75);
    expect(reviewCap(1)).toBe(7);
  });

  it('inclui só revisões que vencem antes do fim do dia de estudo', () => {
    const q = run([review('a', 0.5), review('b', 0.5, end - 1), review('c', 0.5, end + 1)]);
    expect(q.cards.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('ordena pela menor chance de lembrar primeiro', () => {
    const q = run([review('a', 0.9), review('b', 0.2), review('c', 0.5)]);
    expect(q.cards.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('corta no limite, conta o atraso e pausa os novos', () => {
    const reviews = Array.from({ length: 10 }, (_, i) => review(`r${i}`, i / 10));
    const q = run([...reviews, fresh('n1', 1)]);
    expect(q.reviewCount).toBe(7);
    expect(q.backlog).toBe(3);
    expect(q.newCount).toBe(0);
  });

  it('desconta revisões já feitas hoje do limite', () => {
    const reviews = Array.from({ length: 10 }, (_, i) => review(`r${i}`, i / 10));
    const q = run(reviews, { reviewsDoneToday: 5 });
    expect(q.reviewCount).toBe(2);
  });

  it('limita novos a newPerDay menos os já estudados, mais antigos primeiro', () => {
    const q = run([fresh('n3', 3), fresh('n1', 1), fresh('n2', 2), fresh('n4', 4)], { newStudiedToday: 1 });
    expect(q.cards.map((c) => c.id)).toEqual(['n1', 'n2']);
  });

  it('extraNew acrescenta novos mesmo com atraso', () => {
    const reviews = Array.from({ length: 10 }, (_, i) => review(`r${i}`, i / 10));
    const q = run([...reviews, fresh('n1', 1), fresh('n2', 2)], { extraNew: 1 });
    expect(q.newCount).toBe(1);
  });

  it('intercala um novo a cada 4 revisões', () => {
    const reviews = Array.from({ length: 5 }, (_, i) => review(`r${i}`, i / 10));
    const q = run([...reviews, fresh('n1', 1), fresh('n2', 2)]);
    expect(q.cards.map((c) => c.id)).toEqual(['r0', 'r1', 'r2', 'r3', 'n1', 'r4', 'n2']);
  });

  it('ignora cards apagados', () => {
    const q = run([review('a', 0.5), { ...review('b', 0.5), deletedAt: 1 }]);
    expect(q.cards.map((c) => c.id)).toEqual(['a']);
  });

  it('estima minutos a 8 s por card', () => {
    const q = run(Array.from({ length: 7 }, (_, i) => review(`r${i}`, 0.5)));
    expect(q.estimatedMinutes).toBe(1);
    expect(interleave([1, 2], [9], 4)).toEqual([1, 2, 9]);
  });
});
