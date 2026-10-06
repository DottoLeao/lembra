import { Haptics } from '@capacitor/haptics';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { answerHaptic, sessionEndHaptic } from './haptics';
import { isNativeApp } from './platform';

vi.mock('./platform', () => ({ isNativeApp: vi.fn() }));
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(async () => {}), notification: vi.fn(async () => {}) },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM' },
  NotificationType: { Success: 'SUCCESS' },
}));

const native = vi.mocked(isNativeApp);
const h = vi.mocked(Haptics);

beforeEach(() => {
  vi.clearAllMocks();
  native.mockReturnValue(true);
});

describe('answerHaptic', () => {
  it.each([1, 2, 3] as const)('resposta %i vibra leve', async (r) => {
    await answerHaptic(r);
    expect(h.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });

  it('Fácil vibra um pouco mais', async () => {
    await answerHaptic(4);
    expect(h.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
  });

  it('não faz nada na web', async () => {
    native.mockReturnValue(false);
    await answerHaptic(3);
    expect(h.impact).not.toHaveBeenCalled();
  });

  it('engole a falha do plugin (não pode travar a resposta)', async () => {
    h.impact.mockRejectedValueOnce(new Error('sem motor'));
    await expect(answerHaptic(3)).resolves.toBeUndefined();
  });
});

describe('sessionEndHaptic', () => {
  it('vibra como sucesso', async () => {
    await sessionEndHaptic();
    expect(h.notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
  });

  it('engole a falha do plugin', async () => {
    h.notification.mockRejectedValueOnce(new Error('x'));
    await expect(sessionEndHaptic()).resolves.toBeUndefined();
  });
});
