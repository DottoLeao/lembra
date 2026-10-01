import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Verdadeiro dentro do app Android instalado; falso no navegador. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** No app Android, pinta a barra de status com a cor do papel e ícones legíveis nela. */
export async function setSystemBars(theme: 'light' | 'dark'): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#16130F' : '#F3EEE4' });
  } catch {
    // barra de status é cosmética: se o plugin falhar, o app segue igual
  }
}
