import { newId } from '../domain/id';
import type { Scheduler } from '../domain/scheduler';
import type { Card, Rating, ReviewLog } from '../domain/types';
import { db } from './db';

export async function answerCard(
  cardId: string,
  rating: Rating,
  scheduler: Scheduler,
  now = Date.now(),
): Promise<{ card: Card; log: ReviewLog }> {
  return db.transaction('rw', [db.cards, db.reviewLogs], async () => {
    const card = await db.cards.get(cardId);
    if (!card) throw new Error('Card não encontrado.');
    const updated: Card = { ...card, fsrs: scheduler.answer(card.fsrs, rating, now), updatedAt: now };
    const log: ReviewLog = { id: newId(), cardId, rating, reviewedAt: now, prevFsrs: card.fsrs };
    await db.cards.put(updated);
    await db.reviewLogs.add(log);
    return { card: updated, log };
  });
}

export async function undoAnswer(logId: string, now = Date.now()): Promise<Card> {
  return db.transaction('rw', [db.cards, db.reviewLogs], async () => {
    const log = await db.reviewLogs.get(logId);
    if (!log) throw new Error('Nada para desfazer.');
    const card = await db.cards.get(log.cardId);
    if (!card) throw new Error('Card não encontrado.');
    const restored: Card = { ...card, fsrs: log.prevFsrs, updatedAt: now };
    await db.cards.put(restored);
    await db.reviewLogs.delete(logId);
    return restored;
  });
}

export async function logsBetween(from: number, to: number): Promise<ReviewLog[]> {
  return db.reviewLogs.where('reviewedAt').between(from, to, true, false).toArray();
}
