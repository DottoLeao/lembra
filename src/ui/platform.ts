import { Capacitor } from '@capacitor/core';

/** Verdadeiro dentro do app Android instalado; falso no navegador. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
