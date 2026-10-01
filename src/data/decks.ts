import { newId } from '../domain/id';
import type { Deck } from '../domain/types';
import { db } from './db';

export const DECK_COLORS = ['#2F5E8C', '#B5482A', '#2D6E5E', '#8A6412', '#6B4E8C'];

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('O baralho precisa de um nome.');
  return trimmed;
}

export async function createDeck(name: string, color = DECK_COLORS[0], now = Date.now()): Promise<Deck> {
  const deck: Deck = { id: newId(), name: cleanName(name), color, createdAt: now, updatedAt: now };
  await db.decks.add(deck);
  return deck;
}

export async function updateDeck(
  id: string,
  patch: { name?: string; color?: string },
  now = Date.now(),
): Promise<Deck> {
  const current = await db.decks.get(id);
  if (!current) throw new Error('Baralho não encontrado.');
  const updated: Deck = {
    ...current,
    ...(patch.name !== undefined ? { name: cleanName(patch.name) } : {}),
    ...(patch.color !== undefined ? { color: patch.color } : {}),
    updatedAt: now,
  };
  await db.decks.put(updated);
  return updated;
}

export async function getDeck(id: string): Promise<Deck | null> {
  const deck = await db.decks.get(id);
  return deck && deck.deletedAt === undefined ? deck : null;
}

export async function listDecks(): Promise<Deck[]> {
  const all = await db.decks.toArray();
  return all.filter((d) => d.deletedAt === undefined).sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteDeck(id: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', [db.decks, db.cards], async () => {
    await db.decks.update(id, { deletedAt: now, updatedAt: now });
    await db.cards
      .where('deckId')
      .equals(id)
      .filter((c) => c.deletedAt === undefined)
      .modify({ deletedAt: now, updatedAt: now });
  });
}

export async function restoreDeck(id: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', [db.decks, db.cards], async () => {
    const deck = await db.decks.get(id);
    if (!deck || deck.deletedAt === undefined) return;
    const deletedAt = deck.deletedAt;
    await db.decks.where('id').equals(id).modify((d) => {
      delete d.deletedAt;
      d.updatedAt = now;
    });
    await db.cards
      .where('deckId')
      .equals(id)
      .filter((c) => c.deletedAt === deletedAt)
      .modify((c) => {
        delete c.deletedAt;
        c.updatedAt = now;
      });
  });
}
