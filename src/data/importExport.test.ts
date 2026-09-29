import { beforeEach, describe, expect, it } from 'vitest';
import { parseCardJson, type ParsedDeck } from '../domain/cardJson';
import { createScheduler } from '../domain/scheduler';
import { resetDb } from '../test/resetDb';
import { createCard, getCard, listDeckCards } from './cards';
import { db } from './db';
import { createDeck, listDecks } from './decks';
import { exportBackupJson, exportDeckJson, importParsed, markExported } from './importExport';
import { answerCard } from './reviews';
import { getSettings } from './settings';

beforeEach(resetDb);

const parsed = (text: string): ParsedDeck[] => {
  const r = parseCardJson(text);
  if (!r.ok) throw new Error(r.error);
  return r.decks;
};

describe('importParsed', () => {
  it('cria baralho novo com o nome do JSON, mantendo a ordem', async () => {
    const r = await importParsed(parsed('{"deck":"História","cards":[{"front":"1","back":"a"},{"front":"2","back":"b"}]}'), {}, 100);
    expect(r.imported).toBe(2);
    const [deck] = await listDecks();
    expect(deck.name).toBe('História');
    expect((await listDeckCards(deck.id)).map((c) => c.front)).toEqual(['2', '1']);
  });

  it('usa o baralho de destino escolhido', async () => {
    const d = await createDeck('Meu');
    await importParsed(parsed('[{"front":"a","back":"b"}]'), { targetDeckId: d.id });
    expect(await listDeckCards(d.id)).toHaveLength(1);
    expect(await listDecks()).toHaveLength(1);
  });

  it('junta no baralho existente de mesmo nome', async () => {
    const d = await createDeck('História');
    await importParsed(parsed('{"deck":"História","cards":[{"front":"a","back":"b"}]}'));
    expect(await listDecks()).toHaveLength(1);
    expect(await listDeckCards(d.id)).toHaveLength(1);
  });

  it('lista solta sem destino vai para "Importados"', async () => {
    await importParsed(parsed('[{"front":"a","back":"b"}]'));
    expect((await listDecks())[0].name).toBe('Importados');
  });

  it('backup restaura progresso; o registro mais recente vence', async () => {
    const d = await createDeck('Inglês', undefined, 1);
    const c = await createCard(d.id, 'a', 'b', 1);
    await answerCard(c.id, 4, createScheduler(0.9, false), 50);
    const backup = await exportBackupJson();
    await resetDb();
    const first = await importParsed(parsed(backup), {}, 1000);
    expect(first.imported).toBe(1);
    expect((await getCard(c.id))?.fsrs.reps).toBe(1);
    const again = await importParsed(parsed(backup), {}, 2000);
    expect(again.imported).toBe(0);
  });

  it('é atômico: se um card falha, nada é salvo', async () => {
    const decks: ParsedDeck[] = [
      {
        name: 'Quebrado',
        cards: [
          { front: 'ok', back: 'ok' },
          { front: 'x', back: 'y', progress: { id: undefined as unknown as string, createdAt: 0, updatedAt: 0, fsrs: {} as never } },
        ],
      },
    ];
    await expect(importParsed(decks)).rejects.toThrow();
    expect(await db.decks.count()).toBe(0);
    expect(await db.cards.count()).toBe(0);
  });
});

describe('exportação', () => {
  it('exporta baralho em ordem de criação', async () => {
    const d = await createDeck('Inglês');
    await createCard(d.id, 'primeiro', 'x', 1);
    await createCard(d.id, 'segundo', 'y', 2);
    const json = JSON.parse(await exportDeckJson(d.id, false));
    expect(json.cards.map((c: { front: string }) => c.front)).toEqual(['primeiro', 'segundo']);
  });

  it('markExported grava a data', async () => {
    await markExported(123);
    expect((await getSettings()).lastExportAt).toBe(123);
  });
});
