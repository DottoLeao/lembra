import Dexie, { type Table } from 'dexie';
import type { Card, Deck, ReviewLog, Settings } from '../domain/types';

export interface CompletedDay {
  day: string;
}

export class LembraDB extends Dexie {
  decks!: Table<Deck, string>;
  cards!: Table<Card, string>;
  reviewLogs!: Table<ReviewLog, string>;
  settings!: Table<Settings, string>;
  completedDays!: Table<CompletedDay, string>;

  constructor(name = 'lembra') {
    super(name);
    this.version(1).stores({
      decks: 'id, updatedAt',
      cards: 'id, deckId, updatedAt',
      reviewLogs: 'id, cardId, reviewedAt',
      settings: 'id',
      completedDays: 'day',
    });
  }
}

export const db = new LembraDB();
