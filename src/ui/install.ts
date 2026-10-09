import { useSyncExternalStore } from 'react';
import { installCase, showsInstallScreen, type InstallCase } from '../domain/install';
import { isNativeApp } from './platform';
import { readLocal, writeLocal } from './storage';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// o Chrome e o Samsung Internet avisam uma vez só, às vezes antes do React montar: escuta já ao carregar
let deferred: InstallPromptEvent | null = null;
let installedNow = false;
let version = 0;
const listeners = new Set<() => void>();
const changed = () => {
  version += 1;
  listeners.forEach((l) => l());
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // a gente mostra o próprio convite
    deferred = e as InstallPromptEvent;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedNow = true;
    changed();
  });
}

function standalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function currentInstallCase(): InstallCase {
  return installCase({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone: standalone(),
    native: isNativeApp(),
    canPrompt: deferred !== null,
  });
}

const SCREEN_DISMISSED = 'installDismissed';
const BANNER_CLOSED = 'installBannerClosed';

/** A tela de instalação aparece na primeira abertura? */
export function wantsInstallScreen(): boolean {
  return showsInstallScreen(currentInstallCase(), readLocal(SCREEN_DISMISSED) === '1');
}

export const dismissInstallScreen = () => writeLocal(SCREEN_DISMISSED, '1');
export const installBannerClosed = () => readLocal(BANNER_CLOSED) === '1';
export const closeInstallBanner = () => writeLocal(BANNER_CLOSED, '1');

/** Abre o pedido de instalação do navegador (Android e computador). */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const e = deferred;
  if (!e) return 'unavailable';
  deferred = null; // o evento só pode ser usado uma vez
  changed();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome;
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Situação de instalação, atualizada quando o navegador oferece ou conclui a instalação. */
export function useInstall(): { installCase: InstallCase; installedNow: boolean } {
  useSyncExternalStore(subscribe, () => version);
  return { installCase: currentInstallCase(), installedNow };
}
