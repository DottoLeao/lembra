import { isLearning } from './scheduler';
import type { Card, Rating } from './types';

export interface SessionState {
  pending: Card[];
  learning: Card[];
  answered: number;
  again: number;
  startedAt: number;
  /** card que está na tela; só muda ao começar, responder ou desfazer, nunca com o passar do tempo */
  currentId?: string;
}

const byDue = (x: Card, y: Card) => x.fsrs.due - y.fsrs.due;

/** Escolhe o próximo card: aprendizagem vencida primeiro, depois a fila, depois a aprendizagem que vence antes. */
function pickNext(pending: Card[], learning: Card[], now: number): Card | undefined {
  const dueLearning = learning.filter((c) => c.fsrs.due <= now).sort(byDue)[0];
  if (dueLearning) return dueLearning;
  if (pending.length > 0) return pending[0];
  return [...learning].sort(byDue)[0];
}

export function startSession(cards: Card[], now: number): SessionState {
  const pending = [...cards];
  return { pending, learning: [], answered: 0, again: 0, startedAt: now, currentId: pickNext(pending, [], now)?.id };
}

export function currentCard(s: SessionState, now: number): Card | undefined {
  const pinned = s.pending.find((c) => c.id === s.currentId) ?? s.learning.find((c) => c.id === s.currentId);
  return pinned ?? pickNext(s.pending, s.learning, now);
}

export function remaining(s: SessionState): number {
  return s.pending.length + s.learning.length;
}

export function applyAnswer(s: SessionState, updated: Card, rating: Rating, endOfDay: number, now: number): SessionState {
  const inSession = s.pending.some((c) => c.id === updated.id) || s.learning.some((c) => c.id === updated.id);
  if (!inSession) return s;
  const pending = s.pending.filter((c) => c.id !== updated.id);
  const learning = s.learning.filter((c) => c.id !== updated.id);
  if (isLearning(updated.fsrs) && updated.fsrs.due < endOfDay) learning.push(updated);
  return {
    ...s,
    pending,
    learning,
    currentId: pickNext(pending, learning, now)?.id,
    answered: s.answered + 1,
    again: s.again + (rating === 1 ? 1 : 0),
  };
}

export function applyUndo(s: SessionState, restored: Card, rating: Rating): SessionState {
  return {
    ...s,
    pending: [restored, ...s.pending.filter((c) => c.id !== restored.id)],
    currentId: restored.id,
    learning: s.learning.filter((c) => c.id !== restored.id),
    answered: Math.max(0, s.answered - 1),
    again: Math.max(0, s.again - (rating === 1 ? 1 : 0)),
  };
}
