import { describe, expect, it } from 'vitest';
import { installCase, showsInstallScreen, type InstallEnv } from './install';

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.0.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_MODE =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
const SAMSUNG =
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const env = (over: Partial<InstallEnv>): InstallEnv => ({
  userAgent: ANDROID_CHROME,
  maxTouchPoints: 5,
  standalone: false,
  native: false,
  canPrompt: false,
  ...over,
});

describe('installCase', () => {
  it('app nativo (APK) não é PWA', () => {
    expect(installCase(env({ native: true }))).toBe('native');
  });

  it('aberto pelo ícone da tela inicial já está instalado', () => {
    expect(installCase(env({ standalone: true, userAgent: IPHONE_SAFARI }))).toBe('installed');
  });

  it('iPhone no Safari', () => {
    expect(installCase(env({ userAgent: IPHONE_SAFARI }))).toBe('ios-safari');
  });

  it('iPhone em outro navegador', () => {
    expect(installCase(env({ userAgent: IPHONE_CHROME }))).toBe('ios-other');
  });

  it('iPad que se apresenta como Mac, mas tem tela de toque', () => {
    expect(installCase(env({ userAgent: IPAD_DESKTOP_MODE, maxTouchPoints: 5 }))).toBe('ios-safari');
  });

  it('Mac de verdade (sem toque) é computador', () => {
    expect(installCase(env({ userAgent: IPAD_DESKTOP_MODE, maxTouchPoints: 0 }))).toBe('desktop');
  });

  it('Android com o botão de instalar do navegador', () => {
    expect(installCase(env({ userAgent: SAMSUNG, canPrompt: true }))).toBe('android-prompt');
  });

  it('Android sem o botão: instrução pelo menu', () => {
    expect(installCase(env({ userAgent: SAMSUNG, canPrompt: false }))).toBe('android-manual');
  });

  it('computador', () => {
    expect(installCase(env({ userAgent: WINDOWS_CHROME, maxTouchPoints: 0, canPrompt: true }))).toBe('desktop');
  });
});

describe('showsInstallScreen', () => {
  it.each(['ios-safari', 'ios-other', 'android-prompt', 'android-manual'] as const)('mostra em %s', (c) => {
    expect(showsInstallScreen(c, false)).toBe(true);
  });

  it.each(['installed', 'native', 'desktop'] as const)('não mostra em %s', (c) => {
    expect(showsInstallScreen(c, false)).toBe(false);
  });

  it('não mostra de novo depois de "Continuar no navegador"', () => {
    expect(showsInstallScreen('ios-safari', true)).toBe(false);
  });
});
