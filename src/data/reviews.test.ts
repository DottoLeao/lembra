import { beforeEach, describe, expect, it } from 'vitest';
import { createScheduler } from '../domain/scheduler';
import { resetDb } from '../test/resetDb';
import { createCard, getCard } from './cards';
import { db } from './db';
import { createDeck } from './decks';
import { answerCard, logsBetween, undoAnswer } from './reviews';

const sched = createScheduler(0.9, false);
beforeEach(resetDb);

async function oneCard() {
  const d = await createDeck('X');
  return createCard(d.id, 'a', 'b', 1);
}

describe('reviews', () => {
  it('responder atualiza o FSRS do card e registra o estado anterior', async () => {
    const c = await oneCard();
    const { card, log } = await answerCard(c.id, 3, sched, 100);
    expect(card.fsrs.reps).toBe(1);
    expect(card.updatedAt).toBe(100);
    expect(log).toMatchObject({ cardId: c.id, rating: 3, reviewedAt: 100, prevFsrs: c.fsrs });
    expect((await getCard(c.id))?.fsrs.reps).toBe(1);
  });

  it('desfazer restaura o estado exato e apaga o registro', async () => {
    const c = await oneCard();
    const { log } = await answerCard(c.id, 4, sched, 100);
    const restored = await undoAnswer(log.id, 200);
    expect(restored.fsrs).toEqual(c.fsrs);
    expect(await db.reviewLogs.count()).toBe(0);
  });

  it('logsBetween inclui o início e exclui o fim', async () => {
    const c = await oneCard();
    await answerCard(c.id, 3, sched, 100);
    await answerCard(c.id, 3, sched, 200);
    expect((await logsBetween(100, 200)).map((l) => l.reviewedAt)).toEqual([100]);
  });
});
