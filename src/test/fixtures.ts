import { newFsrsState, type FsrsState } from '../domain/scheduler';
import type { Card } from '../domain/types';

export function makeCard(id: string, fsrs: Partial<FsrsState> = {}, extra: Partial<Card> = {}): Card {
  return {
    id,
    deckId: 'd1',
    front: `Frente ${id}`,
    back: `Verso ${id}`,
    createdAt: 0,
    updatedAt: 0,
    fsrs: { ...newFsrsState(0), ...fsrs },
    ...extra,
  };
}
