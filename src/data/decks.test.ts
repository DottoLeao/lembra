import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../test/resetDb';
import { createCard, deleteCard, getCard, listDeckCards } from './cards';
import { createDeck, deleteDeck, getDeck, listDecks, restoreDeck, updateDeck } from './decks';

beforeEach(resetDb);

describe('decks', () => {
  it('cria e lista em ordem de criação', async () => {
    await createDeck('B', '#2F5E8C', 2);
    await createDeck('A', '#B5482A', 1);
    expect((await listDecks()).map((d) => d.name)).toEqual(['A', 'B']);
  });

  it('apara o nome e recusa nome vazio', async () => {
    expect((await createDeck('  Inglês  ')).name).toBe('Inglês');
    await expect(createDeck('   ')).rejects.toThrow('O baralho precisa de um nome.');
  });

  it('renomeia e troca a cor', async () => {
    const d = await createDeck('Velho', '#2F5E8C', 1);
    const u = await updateDeck(d.id, { name: 'Novo', color: '#B5482A' }, 5);
    expect(u).toMatchObject({ name: 'Novo', color: '#B5482A', updatedAt: 5 });
  });

  it('apagar esconde o baralho e seus cards; restaurar traz de volta só os que caíram junto', async () => {
    const d = await createDeck('Química', undefined, 1);
    const keep = await createCard(d.id, 'a', 'b', 1);
    const gone = await createCard(d.id, 'c', 'd', 2);
    await deleteCard(gone.id, 3);
    await deleteDeck(d.id, 4);
    expect(await getDeck(d.id)).toBeNull();
    expect(await listDecks()).toHaveLength(0);
    await restoreDeck(d.id, 5);
    expect((await getDeck(d.id))?.name).toBe('Química');
    expect((await listDeckCards(d.id)).map((c) => c.id)).toEqual([keep.id]);
    expect(await getCard(gone.id)).toBeNull();
  });
});
