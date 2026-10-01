import { describe, expect, it } from 'vitest';
import { parseCardJson } from './cardJson';

const FENCE = '`'.repeat(3);

function ok(text: string) {
  const r = parseCardJson(text);
  if (!r.ok) throw new Error(`esperava sucesso: ${r.error}`);
  return r.decks;
}

function err(text: string) {
  const r = parseCardJson(text);
  if (r.ok) throw new Error('esperava erro');
  return r.error;
}

describe('parseCardJson', () => {
  it('lê o formato padrão', () => {
    const decks = ok('{"version":1,"deck":"História","cards":[{"front":"Ano?","back":"1789"}]}');
    expect(decks).toEqual([{ name: 'História', color: undefined, cards: [{ front: 'Ano?', back: '1789' }] }]);
  });

  it('ignora cercas de código e texto em volta', () => {
    const text = `Aqui estão teus cards:\n${FENCE}json\n{"deck":"X","cards":[{"front":"a","back":"b"}]}\n${FENCE}\nBons estudos!`;
    expect(ok(text)[0].cards).toEqual([{ front: 'a', back: 'b' }]);
  });

  it('aceita lista solta de cards (baralho escolhido depois)', () => {
    const decks = ok('[{"front":"a","back":"b"},{"front":"c","back":"d"}]');
    expect(decks[0].name).toBeUndefined();
    expect(decks[0].cards).toHaveLength(2);
  });

  it('aceita chaves em português e question/answer', () => {
    const decks = ok('[{"frente":"a","verso":"b"},{"question":"c","answer":"d"},{"pergunta":"e","resposta":"f"}]');
    expect(decks[0].cards.map((c) => c.back)).toEqual(['b', 'd', 'f']);
  });

  it('apara espaços', () => {
    expect(ok('[{"front":"  a  ","back":"\\n b "}]')[0].cards[0]).toEqual({ front: 'a', back: 'b' });
  });

  it('aponta o card sem verso', () => {
    expect(err('{"cards":[{"front":"a","back":"b"},{"front":"c"}]}')).toBe('O card 2 está sem verso.');
  });

  it('aponta o card com frente só de espaços', () => {
    expect(err('[{"front":"   ","back":"b"}]')).toBe('O card 1 está sem frente.');
  });

  it('explica JSON ilegível', () => {
    expect(err('isso não é json')).toContain('Não consegui ler o JSON');
  });

  it('explica quando não há lista de cards', () => {
    expect(err('{"deck":"X"}')).toContain('Não encontrei a lista de cards');
    expect(err('{"cards":[]}')).toBe('Nenhum card encontrado.');
  });

  it('lê backup com vários baralhos e progresso', () => {
    const fsrs = { due: 5, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1, learning_steps: 0, reps: 1, lapses: 0, state: 2 };
    const decks = ok(JSON.stringify({
      version: 1,
      decks: [
        { deck: 'A', color: '#2F5E8C', cards: [{ front: 'a', back: 'b', id: 'id-1', createdAt: 1, updatedAt: 2, fsrs }] },
        { deck: 'B', cards: [{ front: 'c', back: 'd' }] },
      ],
    }));
    expect(decks).toHaveLength(2);
    expect(decks[0].color).toBe('#2F5E8C');
    expect(decks[0].cards[0].progress).toEqual({ id: 'id-1', createdAt: 1, updatedAt: 2, fsrs });
    expect(decks[1].cards[0].progress).toBeUndefined();
  });

  it('no backup, o erro diz qual baralho', () => {
    expect(err('{"decks":[{"deck":"A","cards":[{"front":"a","back":"b"}]},{"deck":"B","cards":[{"front":"c"}]}]}'))
      .toBe('No baralho 2: O card 1 está sem verso.');
  });

  it('aguenta importação grande', () => {
    const cards = Array.from({ length: 5000 }, (_, i) => ({ front: `f${i}`, back: `b${i}` }));
    expect(ok(JSON.stringify({ cards }))[0].cards).toHaveLength(5000);
  });
});
