import { beforeEach, describe, expect, it } from 'vitest';
import { isNew } from '../domain/scheduler';
import { resetDb } from '../test/resetDb';
import { createCard, deleteCard, getCard, listActiveCards, listDeckCards, restoreCard, updateCard } from './cards';
import { createDeck, deleteDeck } from './decks';

beforeEach(resetDb);

describe('cards', () => {
  it('cria card novo com texto aparado', async () => {
    const d = await createDeck('X');
    const c = await createCard(d.id, '  Frente ', ' Verso  ', 10);
    expect(c).toMatchObject({ deckId: d.id, front: 'Frente', back: 'Verso', createdAt: 10, updatedAt: 10 });
    expect(isNew(c.fsrs)).toBe(true);
  });

  it('recusa frente ou verso só com espaços', async () => {
    const d = await createDeck('X');
    await expect(createCard(d.id, '   ', 'b')).rejects.toThrow('Frente e verso são obrigatórios.');
    await expect(createCard(d.id, 'a', '\n ')).rejects.toThrow('Frente e verso são obrigatórios.');
  });

  it('edita texto e baralho', async () => {
    const d1 = await createDeck('A');
    const d2 = await createDeck('B');
    const c = await createCard(d1.id, 'a', 'b', 1);
    const u = await updateCard(c.id, { front: ' novo ', deckId: d2.id }, 9);
    expect(u).toMatchObject({ front: 'novo', back: 'b', deckId: d2.id, updatedAt: 9 });
    await expect(updateCard(c.id, { back: ' ' })).rejects.toThrow('Frente e verso são obrigatórios.');
  });

  it('lista cards do baralho do mais novo para o mais antigo', async () => {
    const d = await createDeck('X');
    await createCard(d.id, 'primeiro', 'b', 1);
    await createCard(d.id, 'segundo', 'b', 2);
    expect((await listDeckCards(d.id)).map((c) => c.front)).toEqual(['segundo', 'primeiro']);
  });

  it('apagar e restaurar card', async () => {
    const d = await createDeck('X');
    const c = await createCard(d.id, 'a', 'b', 1);
    await deleteCard(c.id, 2);
    expect(await getCard(c.id)).toBeNull();
    expect(await listDeckCards(d.id)).toHaveLength(0);
    await restoreCard(c.id, 3);
    expect((await getCard(c.id))?.updatedAt).toBe(3);
  });

  it('listActiveCards ignora cards de baralhos apagados', async () => {
    const d1 = await createDeck('A');
    const d2 = await createDeck('B');
    await createCard(d1.id, 'a', 'b');
    await createCard(d2.id, 'c', 'd');
    await deleteDeck(d2.id);
    expect((await listActiveCards()).map((c) => c.front)).toEqual(['a']);
  });
});
