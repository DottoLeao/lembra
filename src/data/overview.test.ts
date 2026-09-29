import { beforeEach, describe, expect, it } from 'vitest';
import { createScheduler } from '../domain/scheduler';
import { resetDb } from '../test/resetDb';
import { createCard } from './cards';
import { createDeck, deleteDeck } from './decks';
import { forecastTomorrow, getStreak, getStudyQueue, getTodayOverview, markDayCompleted } from './overview';
import { answerCard } from './reviews';
import { updateSettings } from './settings';

const now = new Date(2026, 8, 29, 10).getTime();
const sched = createScheduler(0.9, false);
beforeEach(resetDb);

async function deckWith(name: string, n: number, t0 = 0) {
  const d = await createDeck(name, undefined, t0);
  const cards = [];
  for (let i = 0; i < n; i++) cards.push(await createCard(d.id, `${name}${i}`, 'v', t0 + i));
  return { d, cards };
}

describe('overview', () => {
  it('soma a fila de todos os baralhos e conta cada baralho', async () => {
    await deckWith('A', 3, 0);
    await deckWith('B', 2, 100);
    const o = await getTodayOverview(now);
    expect(o.queue.cards).toHaveLength(5);
    expect(o.decks.map((d) => [d.deck.name, d.total, d.dueToday])).toEqual([['A', 3, 3], ['B', 2, 2]]);
    expect(o.onboarded).toBe(false);
  });

  it('ignora baralho apagado e filtra por baralho', async () => {
    const a = await deckWith('A', 2, 0);
    const b = await deckWith('B', 2, 100);
    expect((await getStudyQueue(now, { deckId: a.d.id })).cards).toHaveLength(2);
    await deleteDeck(b.d.id);
    expect((await getStudyQueue(now)).cards).toHaveLength(2);
  });

  it('cards novos respondidos hoje descontam do limite de novos', async () => {
    const { cards } = await deckWith('A', 12);
    await answerCard(cards[0].id, 4, sched, now);
    expect((await getStudyQueue(now)).newCount).toBe(9);
  });

  it('10 respostas no dia contam para a sequência', async () => {
    const { cards } = await deckWith('A', 10);
    for (const c of cards) await answerCard(c.id, 4, sched, now);
    expect((await getStreak(now)).streak).toMatchObject({ days: 1, countedToday: true });
  });

  it('fila zerada marca o dia', async () => {
    await markDayCompleted(now);
    const { streak, week } = await getStreak(now);
    expect(streak.days).toBe(1);
    expect(week[6]).toEqual({ key: '2026-09-29', status: 'done' });
  });

  it('pede backup com 20 cards e nenhum export recente', async () => {
    await deckWith('A', 20);
    expect((await getTodayOverview(now)).backupDue).toBe(true);
    await updateSettings({ lastExportAt: now - 1000 });
    expect((await getTodayOverview(now)).backupDue).toBe(false);
  });

  it('previsão de amanhã usa o limite de novos', async () => {
    await deckWith('A', 12);
    expect(await forecastTomorrow(now)).toBe(10);
  });

  it('onboarded reflete o ajuste', async () => {
    await updateSettings({ onboardedAt: now });
    expect((await getTodayOverview(now)).onboarded).toBe(true);
  });
});
