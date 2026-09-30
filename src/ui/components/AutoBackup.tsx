import { useEffect, useRef } from 'react';
import { runAutoBackup } from '../../data/autoBackup';
import { nativeBackupFs } from '../nativeBackupFs';
import { isNativeApp } from '../platform';
import { useToast } from './Toast';

let warned = false;

/** Roda o backup automático no app Android; nunca lança. Avisa no máximo uma vez por abertura. */
export async function runNativeAutoBackup(now: number, force: boolean, warn?: (msg: string) => void): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    await runAutoBackup(nativeBackupFs, now, { force });
    return true;
  } catch (error) {
    console.error('backup automático falhou', error);
    if (!warned && warn) {
      warned = true;
      warn('Não consegui salvar o backup automático.');
    }
    return false;
  }
}

export function AutoBackup() {
  const toast = useToast();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runNativeAutoBackup(Date.now(), false, (message) => toast({ message }));
  }, [toast]);
  return null;
}
