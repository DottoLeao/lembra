/** Em que situação de instalação o Lembra está aberto. */
export type InstallCase =
  | 'native' // app Android (APK): não é PWA
  | 'installed' // aberto pelo ícone da tela inicial
  | 'ios-safari'
  | 'ios-other' // iPhone em Chrome, Edge, Firefox…
  | 'android-prompt' // o navegador oferece o botão de instalar
  | 'android-manual' // instalar pelo menu do navegador
  | 'desktop';

export interface InstallEnv {
  userAgent: string;
  maxTouchPoints: number;
  standalone: boolean;
  native: boolean;
  canPrompt: boolean;
}

export function installCase(env: InstallEnv): InstallCase {
  if (env.native) return 'native';
  if (env.standalone) return 'installed';
  const ua = env.userAgent;
  // o iPad no modo computador se apresenta como Mac; a tela de toque o denuncia
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && env.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios-safari';
  if (/Android/.test(ua)) return env.canPrompt ? 'android-prompt' : 'android-manual';
  return 'desktop';
}

/** A tela de instalação aparece no celular, no navegador, até a pessoa escolher continuar nele. */
export function showsInstallScreen(c: InstallCase, dismissed: boolean): boolean {
  if (dismissed) return false;
  return c === 'ios-safari' || c === 'ios-other' || c === 'android-prompt' || c === 'android-manual';
}
