import { isLearning } from './scheduler';
import type { Card, Rating } from './types';

export interface SessionState {
  pending: Card[];
  learning: Card[];
  answered: number;
  again: number;
  startedAt: number;
}

export function startSession(cards: Card[], now: number): SessionState {
  return { pending: [...cards], learning: [], answered: 0, again: 0, startedAt: now };
}

const byDue = (x: Card, y: Card) => x.fsrs.due - y.fsrs.due;

export function currentCard(s: SessionState, now: number): Card | undefined {
  const dueLearning = s.learning.filter((c) => c.fsrs.due <= now).sort(byDue)[0];
  if (dueLearning) return dueLearning;
  if (s.pending.length > 0) return s.pending[0];
  return [...s.learning].sort(byDue)[0];
}

export function remaining(s: SessionState): number {
  return s.pending.length + s.learning.length;
}

export function applyAnswer(s: SessionState, updated: Card, rating: Rating, endOfDay: number): SessionState {
  const inSession = s.pending.some((c) => c.id === updated.id) || s.learning.some((c) => c.id === updated.id);
  if (!inSession) return s;
  const pending = s.pending.filter((c) => c.id !== updated.id);
  const learning = s.learning.filter((c) => c.id !== updated.id);
  if (isLearning(updated.fsrs) && updated.fsrs.due < endOfDay) learning.push(updated);
  return { ...s, pending, learning, answered: s.answered + 1, again: s.again + (rating === 1 ? 1 : 0) };
}

export function applyUndo(s: SessionState, restored: Card, rating: Rating): SessionState {
  return {
    ...s,
    pending: [restored, ...s.pending.filter((c) => c.id !== restored.id)],
    learning: s.learning.filter((c) => c.id !== restored.id),
    answered: Math.max(0, s.answered - 1),
    again: Math.max(0, s.again - (rating === 1 ? 1 : 0)),
  };
}
