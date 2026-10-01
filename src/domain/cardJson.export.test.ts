import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import { AI_PROMPT, findWarnings, parseCardJson, serializeBackup, serializeDeck } from './cardJson';
import type { Deck } from './types';

const deck: Deck = { id: 'd1', name: 'Inglês', color: '#2F5E8C', createdAt: 0, updatedAt: 0 };
const cards = [makeCard('c1', {}, { front: 'Put off', back: 'Adiar', createdAt: 1, updatedAt: 2 })];

describe('exportação', () => {
  it('sem progresso: só version, deck e front/back', () => {
    const json = JSON.parse(serializeDeck(deck, cards, false));
    expect(json).toEqual({ version: 1, deck: 'Inglês', cards: [{ front: 'Put off', back: 'Adiar' }] });
  });

  it('com progresso: ida e volta preserva id, datas e FSRS', () => {
    const r = parseCardJson(serializeDeck(deck, cards, true));
    if (!r.ok) throw new Error(r.error);
    expect(r.decks[0].cards[0].progress).toEqual({ id: 'c1', createdAt: 1, updatedAt: 2, fsrs: cards[0].fsrs });
  });

  it('backup com vários baralhos preserva cores', () => {
    const other: Deck = { ...deck, id: 'd2', name: 'Química', color: '#2D6E5E' };
    const r = parseCardJson(serializeBackup([{ deck, cards }, { deck: other, cards: [] }]));
    if (!r.ok) throw new Error(r.error);
    expect(r.decks.map((d) => [d.name, d.color])).toEqual([['Inglês', '#2F5E8C'], ['Química', '#2D6E5E']]);
  });
});

describe('findWarnings', () => {
  it('marca verso longo, duplicata do baralho e duplicata no próprio lote', () => {
    const w = findWarnings(
      [
        { front: 'a', back: 'x'.repeat(301) },
        { front: 'Put  OFF', back: 'adiar' },
        { front: 'b', back: 'c' },
        { front: 'b', back: 'c' },
        { front: 'ok', back: 'x'.repeat(300) },
      ],
      [{ front: 'Put off', back: 'Adiar' }],
    );
    expect(w).toEqual(['long', 'duplicate', null, 'duplicate', null]);
  });
});

describe('AI_PROMPT', () => {
  it('pede o formato JSON com front/back e cards curtos', () => {
    expect(AI_PROMPT).toContain('"front"');
    expect(AI_PROMPT).toContain('"back"');
    expect(AI_PROMPT).toContain('200 caracteres');
  });
});
