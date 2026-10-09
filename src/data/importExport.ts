import { parseCardJson, serializeBackup, serializeDeck, type ParsedDeck } from '../domain/cardJson';
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
    const single = opts.targetDeckId && decks.length === 1 ? opts.targetDeckId : undefined;
    if (single && !existing.some((d) => d.id === single)) {
      throw new Error('Baralho de destino não encontrado.');
    }
    let imported = 0;
    const deckIds = new Set<string>();
    if (single) deckIds.add(single);

    for (const [di, pd] of decks.entries()) {
      let resolved: string | undefined = single;
      if (!resolved) {
        resolved = (pd.name ? existing.find((d) => d.name === pd.name) : undefined)?.id;
      }
      // Baralho novo só é criado quando o primeiro card for realmente adicionado.
      const ensureDeck = async (): Promise<string> => {
        if (resolved) return resolved;
        const deck: Deck = {
          id: newId(),
          name: pd.name ?? 'Importados',
          color: pd.color ?? DECK_COLORS[(existing.length + di) % DECK_COLORS.length],
          createdAt: now + di,
          updatedAt: now,
        };
        await db.decks.add(deck);
        existing.push(deck);
        resolved = deck.id;
        return deck.id;
      };

      for (const [i, pc] of pd.cards.entries()) {
        if (pc.progress) {
          const stored = await db.cards.get(pc.progress.id);
          // Card apagado conta como ausente: importar o backup o traz de volta.
          const current = stored?.deletedAt === undefined ? stored : undefined;
          if (current && current.updatedAt >= pc.progress.updatedAt) continue;
          // Card já existente fica no baralho em que está, mesmo que o nome tenha mudado.
          const deckId =
            stored && existing.some((d) => d.id === stored.deckId) ? stored.deckId : await ensureDeck();
          await db.cards.put({
            id: pc.progress.id,
            deckId,
            front: pc.front,
            back: pc.back,
            createdAt: pc.progress.createdAt || now + i,
            updatedAt: pc.progress.updatedAt || now,
            fsrs: pc.progress.fsrs,
          });
          deckIds.add(deckId);
        } else {
          const deckId = await ensureDeck();
          await db.cards.add({
            id: newId(),
            deckId,
            front: pc.front,
            back: pc.back,
            createdAt: now + i,
            updatedAt: now,
            fsrs: newFsrsState(now),
          });
          deckIds.add(deckId);
        }
        imported++;
      }
    }
    return { imported, deckIds: [...deckIds] };
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

/**
 * Restaura um backup colado (ex.: copiado no Safari e colado no app instalado, que no iPhone guarda
 * os dados à parte) e marca o app como já apresentado.
 */
export async function restoreFromText(
  text: string,
  now = Date.now(),
): Promise<{ ok: true; imported: number } | { ok: false }> {
  if (!text.trim()) return { ok: false };
  const parsed = parseCardJson(text);
  if (!parsed.ok) return { ok: false };
  const { imported } = await importParsed(parsed.decks, {}, now);
  await updateSettings({ onboardedAt: now });
  return { ok: true, imported };
}

export async function markExported(now: number): Promise<void> {
  await updateSettings({ lastExportAt: now });
}
