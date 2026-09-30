import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveToDocuments } from './nativeBackupFs';
import { shareJson } from './share';

vi.mock('./platform', () => ({ isNativeApp: () => true }));
vi.mock('./nativeBackupFs', () => ({ saveToDocuments: vi.fn() }));

const save = vi.mocked(saveToDocuments);

beforeEach(() => {
  save.mockReset();
});

describe('shareJson no app nativo', () => {
  it('grava em Documentos/Lembra e devolve saved', async () => {
    save.mockResolvedValue('Documentos/Lembra/lembra-backup-2026-09-30.json');
    expect(await shareJson('lembra-backup-2026-09-30.json', '{"a":1}')).toBe('saved');
    expect(save).toHaveBeenCalledWith('lembra-backup-2026-09-30.json', '{"a":1}');
  });

  it('repassa a falha ao gravar', async () => {
    save.mockRejectedValue(new Error('sem permissão'));
    await expect(shareJson('x.json', '{}')).rejects.toThrow('sem permissão');
  });
});
