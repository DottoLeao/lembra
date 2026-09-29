import { serializeBackup, serializeDeck, type ParsedDeck } from '../domain/cardJson';
import { newId } from '../domain/id';
import { newFsrsState } from '../domain/scheduler';
import type { Deck } from '../domain/types';
import { db } from './db';
import { DECK_COLORS, getDeck, listDecks } from './decks';
import { listDeckCards } from './cards';
import { updateSettings } from './settings';

export async function importParsed(
  decks: ParsedDeck[],
  opts: { targetDeckId?: string } = {},
  now = Date.now(),
): Promise<{ imported: number; deckIds: string[] }> {
  return db.transaction('rw', [db.decks, db.cards], async () => {
    const existing = (await db.decks.toArray()).filter((d) => d.deletedAt === undefined);
    let imported = 0;
    const deckIds: string[] = [];

    for (const [di, pd] of decks.entries()) {
      let deckId: string;
      if (opts.targetDeckId && decks.length === 1) {
        deckId = opts.targetDeckId;
      } else {
        const match = pd.name ? existing.find((d) => d.name === pd.name) : undefined;
        if (match) {
          deckId = match.id;
        } else {
          const deck: Deck = {
            id: newId(),
            name: pd.name ?? 'Importados',
            color: pd.color ?? DECK_COLORS[(existing.length + di) % DECK_COLORS.length],
            createdAt: now + di,
            updatedAt: now,
          };
          await db.decks.add(deck);
          existing.push(deck);
          deckId = deck.id;
        }
      }
      deckIds.push(deckId);

      for (const [i, pc] of pd.cards.entries()) {
        if (pc.progress) {
          const current = await db.cards.get(pc.progress.id);
          if (current && current.updatedAt >= pc.progress.updatedAt) continue;
          await db.cards.put({
            id: pc.progress.id,
            deckId,
            front: pc.front,
            back: pc.back,
            createdAt: pc.progress.createdAt || now + i,
            updatedAt: pc.progress.updatedAt || now,
            fsrs: pc.progress.fsrs,
          });
        } else {
          await db.cards.add({
            id: newId(),
            deckId,
            front: pc.front,
            back: pc.back,
            createdAt: now + i,
            updatedAt: now,
            fsrs: newFsrsState(now),
          });
        }
        imported++;
      }
    }
    return { imported, deckIds: [...new Set(deckIds)] };
  });
}

export async function exportDeckJson(deckId: string, includeProgress: boolean): Promise<string> {
  const deck = await getDeck(deckId);
  if (!deck) throw new Error('Baralho não encontrado.');
  const cards = (await listDeckCards(deckId)).reverse();
  return serializeDeck(deck, cards, includeProgress);
}

export async function exportBackupJson(): Promise<string> {
  const decks = await listDecks();
  const entries = await Promise.all(
    decks.map(async (deck) => ({ deck, cards: (await listDeckCards(deck.id)).reverse() })),
  );
  return serializeBackup(entries);
}

export async function markExported(now: number): Promise<void> {
  await updateSettings({ lastExportAt: now });
}
