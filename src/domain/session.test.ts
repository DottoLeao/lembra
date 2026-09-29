import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import { State } from './scheduler';
import { applyAnswer, applyUndo, currentCard, remaining, startSession } from './session';

const now = 1_000_000;
const MIN = 60_000;
const END = now + 10 * 60 * MIN;
const a = makeCard('a');
const b = makeCard('b');
const learning = (card: typeof a, due: number) => ({ ...card, fsrs: { ...card.fsrs, state: State.Relearning, due } });
const graduated = (card: typeof a) => ({ ...card, fsrs: { ...card.fsrs, state: State.Review, due: now + 3 * 24 * 60 * MIN } });

describe('session', () => {
  it('começa pelo primeiro card da fila', () => {
    const s = startSession([a, b], now);
    expect(currentCard(s, now)?.id).toBe('a');
    expect(remaining(s)).toBe(2);
  });

  it('card respondido e graduado sai da sessão', () => {
    const s = applyAnswer(startSession([a, b], now), graduated(a), 3, END);
    expect(currentCard(s, now)?.id).toBe('b');
    expect(s.answered).toBe(1);
    expect(s.again).toBe(0);
  });

  it('Errei manda o card para aprendizagem e ele volta quando vence', () => {
    let s = startSession([a, b], now);
    s = applyAnswer(s, learning(a, now + 10 * MIN), 1, END);
    expect(s.again).toBe(1);
    expect(currentCard(s, now)?.id).toBe('b');
    expect(currentCard(s, now + 11 * MIN)?.id).toBe('a');
  });

  it('sem fila, mostra o card de aprendizagem mesmo antes de vencer', () => {
    let s = startSession([a], now);
    s = applyAnswer(s, learning(a, now + 10 * MIN), 1, END);
    expect(currentCard(s, now)?.id).toBe('a');
    expect(remaining(s)).toBe(1);
  });

  it('aprendizagem que só vence depois do fim do dia sai da sessão', () => {
    const s = applyAnswer(startSession([a], now), learning(a, END + MIN), 1, END);
    expect(remaining(s)).toBe(0);
  });

  it('responder duas vezes o mesmo card conta só uma (toque duplo)', () => {
    const once = applyAnswer(startSession([a, b], now), graduated(a), 4, END);
    const twice = applyAnswer(once, graduated(a), 4, END);
    expect(twice).toBe(once);
    expect(twice.answered).toBe(1);
  });

  it('desfazer devolve o card ao início e desconta os contadores', () => {
    let s = startSession([a, b], now);
    s = applyAnswer(s, learning(a, now + 10 * MIN), 1, END);
    s = applyUndo(s, a, 1);
    expect(currentCard(s, now)?.id).toBe('a');
    expect(s.learning).toHaveLength(0);
    expect(s.answered).toBe(0);
    expect(s.again).toBe(0);
    expect(remaining(s)).toBe(2);
  });

  it('desfazer mostra o card restaurado mesmo com outro de aprendizagem vencido', () => {
    let s = startSession([a, b], now);
    s = applyAnswer(s, learning(a, now + 10 * MIN), 1, END);
    s = applyAnswer(s, learning(b, now + 10 * MIN), 1, END);
    const later = now + 11 * MIN;
    const aDue = s.learning.find((c) => c.id === 'a')!;
    s = applyAnswer(s, learning(a, later + 10 * MIN), 1, END);
    s = applyUndo(s, aDue, 1);
    expect(currentCard(s, later)?.id).toBe('a');
    s = applyAnswer(s, graduated(a), 3, END);
    expect(currentCard(s, later)?.id).toBe('b');
  });
});
