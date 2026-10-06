import { describe, expect, it, vi } from 'vitest';
import { nativePlatform } from './platform';
import { savedMessage } from './share';

vi.mock('./platform', () => ({ isNativeApp: () => true, nativePlatform: vi.fn() }));
// módulo real (visibleFolder decide a pasta), com o plugin de arquivos neutralizado
vi.mock('@capacitor/filesystem', () => ({ Directory: {}, Encoding: {}, Filesystem: {} }));

describe('savedMessage', () => {
  it('aponta Documentos/Lembra no Android', () => {
    vi.mocked(nativePlatform).mockReturnValue('android');
    expect(savedMessage()).toBe('Salvo em Documentos/Lembra');
  });

  it('aponta o app Arquivos no iPhone', () => {
    vi.mocked(nativePlatform).mockReturnValue('ios');
    expect(savedMessage()).toBe('Salvo em Arquivos › No meu iPhone › Lembra');
  });
});
