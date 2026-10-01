import { describe, expect, it } from 'vitest';
import { addDays, studyDayEnd, studyDayKey, studyDayStart, weekKey } from './studyDay';

const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).getTime(); // setembro de 2026, hora local

describe('studyDay', () => {
  it('antes das 4h ainda é o dia anterior', () => {
    expect(studyDayStart(at(29, 3, 59), 4)).toBe(at(28, 4));
  });
  it('às 4h começa um novo dia', () => {
    expect(studyDayStart(at(29, 4), 4)).toBe(at(29, 4));
  });
  it('o fim é o início do dia seguinte', () => {
    expect(studyDayEnd(at(29, 10), 4)).toBe(at(30, 4));
  });
  it('a chave usa a data do dia de estudo', () => {
    expect(studyDayKey(at(30, 2), 4)).toBe('2026-09-29');
    expect(studyDayKey(at(30, 5), 4)).toBe('2026-09-30');
  });
  it('addDays atravessa meses', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('weekKey devolve a segunda-feira', () => {
    expect(weekKey('2026-10-04')).toBe('2026-09-28'); // domingo
    expect(weekKey('2026-09-28')).toBe('2026-09-28'); // segunda
    expect(weekKey('2026-09-29')).toBe('2026-09-28'); // terça
  });
});
