import { studyDayKey } from './studyDay';

export const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const AUTO_BACKUP_KEEP = 7;

const BACKUP_NAME = /^lembra-backup-\d{4}-\d{2}-\d{2}\.json$/;

export function shouldAutoBackup(lastAutoBackupAt: number | undefined, now: number): boolean {
  return lastAutoBackupAt === undefined || now - lastAutoBackupAt > AUTO_BACKUP_INTERVAL_MS;
}

export function backupFileName(now: number, dayStartHour: number): string {
  return `lembra-backup-${studyDayKey(now, dayStartHour)}.json`;
}

/** Nomes com data ISO ordenam cronologicamente como texto. */
export function filesToDelete(fileNames: string[], keep = AUTO_BACKUP_KEEP): string[] {
  const backups = fileNames.filter((n) => BACKUP_NAME.test(n)).sort();
  return backups.slice(0, Math.max(0, backups.length - keep));
}
