import { describe, expect, it } from 'vitest';
import { backupFileName, filesToDelete, shouldAutoBackup } from './autoBackup';

const HOUR = 3_600_000;
const now = new Date(2026, 8, 30, 10).getTime();

describe('autoBackup', () => {
  it('faz backup se nunca fez ou se passou mais de 24 h', () => {
    expect(shouldAutoBackup(undefined, now)).toBe(true);
    expect(shouldAutoBackup(now - 23 * HOUR, now)).toBe(false);
    expect(shouldAutoBackup(now - 25 * HOUR, now)).toBe(true);
  });

  it('nome do arquivo usa o dia de estudo (antes das 4h é o dia anterior)', () => {
    expect(backupFileName(now, 4)).toBe('lembra-backup-2026-09-30.json');
    expect(backupFileName(new Date(2026, 8, 30, 2).getTime(), 4)).toBe('lembra-backup-2026-09-29.json');
  });

  it('mantém os 7 mais recentes e ignora arquivos fora do padrão', () => {
    const days = ['01', '02', '03', '04', '05', '06', '07', '08', '09'].map((d) => `lembra-backup-2026-09-${d}.json`);
    const shuffled = [days[4], 'outro.txt', days[0], days[8], days[2], 'lembra-backup-velho.json', days[1], days[3], days[5], days[6], days[7]];
    expect(filesToDelete(shuffled)).toEqual([days[0], days[1]]);
    expect(filesToDelete(days.slice(0, 3))).toEqual([]);
    expect(filesToDelete(days, 8)).toEqual([days[0]]);
  });
});
