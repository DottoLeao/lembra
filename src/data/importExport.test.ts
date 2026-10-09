import { beforeEach, describe, expect, it } from 'vitest';
import { parseCardJson, type ParsedDeck } from '../domain/cardJson';
import { createScheduler } from '../domain/scheduler';
import { resetDb } from '../test/resetDb';
import { createCard, deleteCard, getCard, listDeckCards } from './cards';
import { db } from './db';
import { createDeck, deleteDeck, listDecks, updateDeck } from './decks';
import { exportBackupJson, exportDeckJson, importParsed, markExported, restoreFromText } from './importExport';
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

  it('reimportar backup após renomear o baralho não cria baralho nem move cards', async () => {
    const d = await createDeck('Inglês', undefined, 1);
    const c = await createCard(d.id, 'a', 'b', 1);
    const backup = await exportBackupJson();
    await updateDeck(d.id, { name: 'English' }, 5);
    const r = await importParsed(parsed(backup), {}, 1000);
    expect(r.imported).toBe(0);
    expect(r.deckIds).toEqual([]);
    const decks = await listDecks();
    expect(decks.map((x) => x.name)).toEqual(['English']);
    expect((await getCard(c.id))?.deckId).toBe(d.id);
  });

  it('arquivo mais novo vence sem mudar o baralho do card', async () => {
    const d = await createDeck('Inglês', undefined, 1);
    const c = await createCard(d.id, 'a', 'b', 1);
    const backup = JSON.parse(await exportBackupJson());
    const entry = backup.decks[0].cards[0];
    entry.front = 'novo';
    entry.updatedAt = 9999;
    await updateDeck(d.id, { name: 'English' }, 5);
    const r = await importParsed(parsed(JSON.stringify(backup)), {}, 20000);
    expect(r.imported).toBe(1);
    expect(await db.decks.count()).toBe(1);
    const got = await getCard(c.id);
    expect(got?.front).toBe('novo');
    expect(got?.deckId).toBe(d.id);
    expect(got?.updatedAt).toBe(9999);
  });

  it('backup recupera baralho e cards apagados depois dele', async () => {
    const d = await createDeck('Inglês', undefined, 1);
    const c1 = await createCard(d.id, 'a', 'b', 1);
    const c2 = await createCard(d.id, 'c', 'd', 2);
    const backup = await exportBackupJson();
    await deleteDeck(d.id, 5000);
    const r = await importParsed(parsed(backup), {}, 6000);
    expect(r.imported).toBe(2);
    const decks = await listDecks();
    expect(decks.map((x) => x.name)).toEqual(['Inglês']);
    expect(r.deckIds).toEqual([decks[0].id]);
    const cards = await listDeckCards(decks[0].id);
    expect(cards.map((c) => c.id).sort()).toEqual([c1.id, c2.id].sort());
    expect(cards.every((c) => c.deletedAt === undefined)).toBe(true);
  });

  it('backup recupera card apagado no baralho em que ele estava', async () => {
    const d = await createDeck('Inglês', undefined, 1);
    const c = await createCard(d.id, 'a', 'b', 1);
    const backup = await exportBackupJson();
    await updateDeck(d.id, { name: 'English' }, 5);
    await deleteCard(c.id, 5000);
    const r = await importParsed(parsed(backup), {}, 6000);
    expect(r.imported).toBe(1);
    expect(await db.decks.count()).toBe(1);
    const got = await getCard(c.id);
    expect(got?.deletedAt).toBeUndefined();
    expect(got?.deckId).toBe(d.id);
  });

  it('destino inexistente falha sem salvar nada', async () => {
    await expect(
      importParsed(parsed('[{"front":"a","back":"b"}]'), { targetDeckId: 'nao-existe' }),
    ).rejects.toThrow('Baralho de destino não encontrado.');
    expect(await db.decks.count()).toBe(0);
    expect(await db.cards.count()).toBe(0);
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

describe('restoreFromText (levar os cards do navegador para o app)', () => {
  it('restaura o backup colado, com progresso, e marca o app como já apresentado', async () => {
    const d = await createDeck('Inglês');
    const c = await createCard(d.id, 'dog', 'cão');
    await answerCard(c.id, 3, createScheduler(0.9), 500);
    const backup = await exportBackupJson();
    await resetDb();

    const r = await restoreFromText(backup, 1000);
    expect(r).toEqual({ ok: true, imported: 1 });
    const [deck] = await listDecks();
    expect(deck.name).toBe('Inglês');
    expect((await getCard(c.id))?.fsrs.reps).toBe(1);
    expect((await getSettings()).onboardedAt).toBe(1000);
  });

  it('recusa texto que não é um backup do Lembra, sem mexer em nada', async () => {
    const r = await restoreFromText('oi, tudo bem?', 1000);
    expect(r.ok).toBe(false);
    expect(await listDecks()).toEqual([]);
    expect((await getSettings()).onboardedAt).toBeUndefined();
  });

  it('recusa área de transferência vazia', async () => {
    expect((await restoreFromText('   ', 1000)).ok).toBe(false);
  });
});
