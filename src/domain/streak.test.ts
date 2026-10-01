import { describe, expect, it } from 'vitest';
import { computeStreak, countedDays, lastSevenDays } from './streak';

const days = (...keys: string[]) => new Set(keys);

describe('streak', () => {
  it('sem dias contados, sequência zero com folga disponível', () => {
    expect(computeStreak(days(), '2026-10-01')).toEqual({ days: 0, freezeAvailable: true, countedToday: false });
  });

  it('dias seguidos até hoje', () => {
    const s = computeStreak(days('2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'), '2026-10-01');
    expect(s).toEqual({ days: 5, freezeAvailable: true, countedToday: true });
  });

  it('hoje ainda não contou: a sequência de ontem continua', () => {
    const s = computeStreak(days('2026-09-29', '2026-09-30'), '2026-10-01');
    expect(s.days).toBe(2);
    expect(s.countedToday).toBe(false);
  });

  it('um dia perdido na semana usa a folga', () => {
    // 28/09 (segunda) perdido; semana anterior completa de quinta a domingo
    const counted = days('2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-29', '2026-09-30', '2026-10-01');
    expect(computeStreak(counted, '2026-10-01')).toEqual({ days: 7, freezeAvailable: false, countedToday: true });
  });

  it('dois dias perdidos na mesma semana quebram a sequência', () => {
    // 22/09 e 23/09 perdidos, ambos na semana de 21/09
    const counted = days('2026-09-21', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01');
    expect(computeStreak(counted, '2026-10-01')).toEqual({ days: 8, freezeAvailable: true, countedToday: true });
  });

  it('dia conta com 10 respostas ou com a fila zerada', () => {
    const perDay = new Map([['2026-09-29', 10], ['2026-09-30', 3]]);
    expect(countedDays(perDay, ['2026-10-01'])).toEqual(days('2026-09-29', '2026-10-01'));
  });

  it('últimos 7 dias com status', () => {
    const week = lastSevenDays(days('2026-09-29', '2026-10-01'), '2026-10-01');
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ key: '2026-09-25', status: 'missed' });
    expect(week[4]).toEqual({ key: '2026-09-29', status: 'done' });
    expect(week[6]).toEqual({ key: '2026-10-01', status: 'done' });
    expect(lastSevenDays(days(), '2026-10-01')[6].status).toBe('today');
  });
});
