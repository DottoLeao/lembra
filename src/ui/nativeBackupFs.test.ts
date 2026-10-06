import { Filesystem } from '@capacitor/filesystem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nativePlatform } from './platform';
import { nativeBackupFs, saveToDocuments } from './nativeBackupFs';

vi.mock('./platform', () => ({ nativePlatform: vi.fn() }));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Documents: 'DOCUMENTS' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    checkPermissions: vi.fn(async () => ({ publicStorage: 'granted' })),
    requestPermissions: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

const platform = vi.mocked(nativePlatform);
const fs = vi.mocked(Filesystem);

beforeEach(() => vi.clearAllMocks());

describe('no Android', () => {
  beforeEach(() => platform.mockReturnValue('android'));

  it('grava em Documentos/Lembra', async () => {
    expect(await saveToDocuments('a.json', '{}')).toBe('Documentos/Lembra/a.json');
    expect(fs.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'Lembra/a.json', directory: 'DOCUMENTS' }));
  });

  it('lista e apaga dentro de Lembra', async () => {
    fs.readdir.mockResolvedValue({ files: [{ name: 'lembra-backup-2026-10-01.json' }] } as never);
    expect(await nativeBackupFs.list()).toEqual(['lembra-backup-2026-10-01.json']);
    expect(fs.readdir).toHaveBeenCalledWith({ path: 'Lembra', directory: 'DOCUMENTS' });
    await nativeBackupFs.remove('lembra-backup-2026-10-01.json');
    expect(fs.deleteFile).toHaveBeenCalledWith({ path: 'Lembra/lembra-backup-2026-10-01.json', directory: 'DOCUMENTS' });
  });
});

describe('no iPhone', () => {
  beforeEach(() => platform.mockReturnValue('ios'));

  it('grava na raiz de Documentos, que o app Arquivos mostra como Lembra', async () => {
    expect(await saveToDocuments('a.json', '{}')).toBe('Arquivos › No meu iPhone › Lembra/a.json');
    expect(fs.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'a.json', directory: 'DOCUMENTS' }));
  });

  it('lista a raiz (com outros arquivos) e apaga só o nome pedido', async () => {
    fs.readdir.mockResolvedValue({ files: [{ name: 'lembra-backup-2026-10-01.json' }, { name: 'capitais.json' }] } as never);
    expect(await nativeBackupFs.list()).toEqual(['lembra-backup-2026-10-01.json', 'capitais.json']);
    expect(fs.readdir).toHaveBeenCalledWith({ path: '', directory: 'DOCUMENTS' });
    await nativeBackupFs.remove('lembra-backup-2026-10-01.json');
    expect(fs.deleteFile).toHaveBeenCalledWith({ path: 'lembra-backup-2026-10-01.json', directory: 'DOCUMENTS' });
  });
});
