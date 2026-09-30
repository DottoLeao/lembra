import { backupFileName, filesToDelete, shouldAutoBackup } from '../domain/autoBackup';
import { listDecks } from './decks';
import { exportBackupJson } from './importExport';
import { getSettings, updateSettings } from './settings';

/** Onde o backup automático é guardado; no app é a pasta Documentos/Lembra. */
export interface BackupFs {
  list(): Promise<string[]>;
  write(name: string, data: string): Promise<void>;
  remove(name: string): Promise<void>;
}

export async function runAutoBackup(
  fs: BackupFs,
  now: number,
  opts: { force?: boolean } = {},
): Promise<'saved' | 'skipped' | 'disabled' | 'empty'> {
  const settings = await getSettings();
  if (settings.autoBackup === false) return 'disabled';
  if (!opts.force && !shouldAutoBackup(settings.lastAutoBackupAt, now)) return 'skipped';
  // banco vazio (ex.: dados do app limpos): não sobrescreve nem apaga os backups bons
  if ((await listDecks()).length === 0) return 'empty';

  await fs.write(backupFileName(now, settings.dayStartHour), await exportBackupJson());
  await updateSettings({ lastAutoBackupAt: now });

  for (const name of filesToDelete(await fs.list())) {
    try {
      await fs.remove(name);
    } catch {
      // arquivo que o Android não deixa apagar (ex.: de outra instalação): segue
    }
  }
  return 'saved';
}
