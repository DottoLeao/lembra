import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type NativePlatform = 'android' | 'ios' | 'web';

/** Em que sistema o app está rodando ('web' no navegador). */
export function nativePlatform(): NativePlatform {
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios' ? p : 'web';
}

/** Verdadeiro dentro do app instalado (Android ou iPhone); falso no navegador. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** No app, deixa os ícones da barra de status legíveis e, no Android, pinta o fundo com o papel. */
export async function setSystemBars(theme: 'light' | 'dark'): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    if (nativePlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#16130F' : '#F3EEE4' });
    }
  } catch {
    // barra de status é cosmética: se o plugin falhar, o app segue igual
  }
}
