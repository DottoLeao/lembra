import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { Rating } from '../domain/types';
import { isNativeApp } from './platform';

// vibração é cosmética: nunca pode atrasar ou quebrar o estudo
async function safely(fn: () => Promise<void>): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await fn();
  } catch {
    // aparelho sem motor de vibração ou plugin indisponível: segue sem vibrar
  }
}

/** Toque leve ao responder; Fácil um pouco mais marcado. */
export function answerHaptic(rating: Rating): Promise<void> {
  return safely(() => Haptics.impact({ style: rating === 4 ? ImpactStyle.Medium : ImpactStyle.Light }));
}

/** Vibração de sucesso ao terminar a sessão. */
export function sessionEndHaptic(): Promise<void> {
  return safely(() => Haptics.notification({ type: NotificationType.Success }));
}
