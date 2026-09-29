import type { FsrsState } from './scheduler';

export type Rating = 1 | 2 | 3 | 4;

export interface Deck {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  fsrs: FsrsState;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: Rating;
  reviewedAt: number;
  /** Estado FSRS antes da resposta; usado para desfazer. */
  prevFsrs: FsrsState;
}

export interface Settings {
  id: 'settings';
  minutesPerDay: number;
  newPerDay: number;
  desiredRetention: number;
  dayStartHour: number;
  lastExportAt?: number;
  onboardedAt?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  minutesPerDay: 10,
  newPerDay: 10,
  desiredRetention: 0.9,
  dayStartHour: 4,
};
