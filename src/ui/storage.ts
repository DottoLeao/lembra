function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const readLocal = (key: string): string | null => safe(() => localStorage.getItem(key), null);
export const writeLocal = (key: string, value: string): void => safe(() => localStorage.setItem(key, value), undefined);
export const readSession = (key: string): string | null => safe(() => sessionStorage.getItem(key), null);
export const writeSession = (key: string, value: string): void => safe(() => sessionStorage.setItem(key, value), undefined);

/** Pede ao navegador para não apagar os dados sozinho. Só pergunta uma vez. */
export async function requestPersistentStorage(): Promise<void> {
  if (readLocal('persistAsked')) return;
  writeLocal('persistAsked', '1');
  try {
    await navigator.storage?.persist?.();
  } catch {
    // navegador sem suporte: segue sem persistência garantida
  }
}
