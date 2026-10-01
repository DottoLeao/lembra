import { beforeEach, describe, expect, it } from 'vitest';
import { parseCardJson } from '../domain/cardJson';
import { resetDb } from '../test/resetDb';
import { runAutoBackup, type BackupFs } from './autoBackup';
import { createCard } from './cards';
import { createDeck } from './decks';
import { getSettings, updateSettings } from './settings';

const HOUR = 3_600_000;
const now = new Date(2026, 8, 30, 10).getTime();

function fakeFs(initial: string[] = []) {
  const files = new Map<string, string>(initial.map((n) => [n, '{}']));
  const removed: string[] = [];
  const fs: BackupFs = {
    list: async () => [...files.keys()],
    write: async (name, data) => void files.set(name, data),
    remove: async (name) => {
      removed.push(name);
      files.delete(name);
    },
  };
  return { fs, files, removed };
}

beforeEach(resetDb);

describe('runAutoBackup', () => {
  it('grava o backup completo do dia e registra a data', async () => {
    const d = await createDeck('Inglês');
    await createCard(d.id, 'Put off', 'Adiar');
    const { fs, files } = fakeFs();
    expect(await runAutoBackup(fs, now)).toBe('saved');
    const content = files.get('lembra-backup-2026-09-30.json')!;
    const parsed = parseCardJson(content);
    expect(parsed.ok && parsed.decks[0].cards[0].front).toBe('Put off');
    expect((await getSettings()).lastAutoBackupAt).toBe(now);
  });

  it('dentro de 24 h não repete, a não ser forçado; no mesmo dia sobrescreve', async () => {
    await createDeck('Inglês');
    const { fs, files } = fakeFs();
    await runAutoBackup(fs, now);
    expect(await runAutoBackup(fs, now + HOUR)).toBe('skipped');
    expect(await runAutoBackup(fs, now + HOUR, { force: true })).toBe('saved');
    expect(files.size).toBe(1);
  });

  it('desligado não grava nada, nem forçado', async () => {
    await updateSettings({ autoBackup: false });
    const { fs, files } = fakeFs();
    expect(await runAutoBackup(fs, now, { force: true })).toBe('disabled');
    expect(files.size).toBe(0);
  });

  it('apaga os mais antigos além de 7 e não toca em arquivos alheios', async () => {
    const old = ['01', '02', '03', '04', '05', '06', '07', '08'].map((d) => `lembra-backup-2026-09-${d}.json`);
    await createDeck('Inglês');
    const { fs, removed, files } = fakeFs([...old, 'foto.jpg']);
    await runAutoBackup(fs, now);
    expect(removed.sort()).toEqual(['lembra-backup-2026-09-01.json', 'lembra-backup-2026-09-02.json']);
    expect(files.has('foto.jpg')).toBe(true);
  });

  it('sem nenhum baralho não grava nem apaga nada', async () => {
    const old = ['01', '02', '03', '04', '05', '06', '07', '08'].map((d) => `lembra-backup-2026-09-${d}.json`);
    const { fs, files, removed } = fakeFs(old);
    expect(await runAutoBackup(fs, now, { force: true })).toBe('empty');
    expect(files.size).toBe(8);
    expect(removed).toEqual([]);
    expect((await getSettings()).lastAutoBackupAt).toBeUndefined();
  });

  it('erro ao apagar arquivo antigo não interrompe', async () => {
    const old = ['01', '02', '03', '04', '05', '06', '07', '08'].map((d) => `lembra-backup-2026-09-${d}.json`);
    await createDeck('Inglês');
    const { fs } = fakeFs(old);
    fs.remove = async () => {
      throw new Error('arquivo de outra instalação');
    };
    expect(await runAutoBackup(fs, now)).toBe('saved');
  });

  it('erro ao gravar é repassado e não marca a data', async () => {
    await createDeck('Inglês');
    const { fs } = fakeFs();
    fs.write = async () => {
      throw new Error('sem permissão');
    };
    await expect(runAutoBackup(fs, now)).rejects.toThrow('sem permissão');
    expect((await getSettings()).lastAutoBackupAt).toBeUndefined();
  });
});
