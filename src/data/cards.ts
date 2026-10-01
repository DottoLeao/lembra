import { newId } from '../domain/id';
import { newFsrsState } from '../domain/scheduler';
import type { Card } from '../domain/types';
import { db } from './db';
import { listDecks } from './decks';

function cleanText(front: string, back: string): { front: string; back: string } {
  const f = front.trim();
  const b = back.trim();
  if (!f || !b) throw new Error('Frente e verso são obrigatórios.');
  return { front: f, back: b };
}

export async function createCard(deckId: string, front: string, back: string, now = Date.now()): Promise<Card> {
  const card: Card = {
    id: newId(),
    deckId,
    ...cleanText(front, back),
    createdAt: now,
    updatedAt: now,
    fsrs: newFsrsState(now),
  };
  await db.cards.add(card);
  return card;
}

export async function updateCard(
  id: string,
  patch: { front?: string; back?: string; deckId?: string },
  now = Date.now(),
): Promise<Card> {
  const current = await db.cards.get(id);
  if (!current) throw new Error('Card não encontrado.');
  const text = cleanText(patch.front ?? current.front, patch.back ?? current.back);
  const updated: Card = { ...current, ...text, deckId: patch.deckId ?? current.deckId, updatedAt: now };
  await db.cards.put(updated);
  return updated;
}

export async function getCard(id: string): Promise<Card | null> {
  const card = await db.cards.get(id);
  return card && card.deletedAt === undefined ? card : null;
}

export async function listDeckCards(deckId: string): Promise<Card[]> {
  const cards = await db.cards.where('deckId').equals(deckId).toArray();
  return cards.filter((c) => c.deletedAt === undefined).sort((a, b) => b.createdAt - a.createdAt);
}

export async function listActiveCards(): Promise<Card[]> {
  const deckIds = new Set((await listDecks()).map((d) => d.id));
  const cards = await db.cards.toArray();
  return cards.filter((c) => c.deletedAt === undefined && deckIds.has(c.deckId));
}

export async function deleteCard(id: string, now = Date.now()): Promise<void> {
  await db.cards.update(id, { deletedAt: now, updatedAt: now });
}

export async function restoreCard(id: string, now = Date.now()): Promise<void> {
  await db.cards.where('id').equals(id).modify((c) => {
    delete c.deletedAt;
    c.updatedAt = now;
  });
}
