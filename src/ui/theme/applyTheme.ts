import { resolveTheme, type ThemePref } from '../../domain/theme';
import { setSystemBars } from '../platform';

/** Cópia da preferência lida pelo script do index.html antes do CSS, para abrir sem piscar. */
export const THEME_STORAGE_KEY = 'lembra-theme';

const THEME_COLOR = { light: '#F3EEE4', dark: '#16130F' } as const;
const TRANSITION_MS = 250;

let systemQuery: MediaQueryList | undefined;
let followSystem: (() => void) | undefined;
let transitionTimer: ReturnType<typeof setTimeout> | undefined;

function paint(theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  const previous = root.dataset.theme;
  if (previous && previous !== theme) {
    // transição suave só na troca; com movimento reduzido o CSS anula a duração
    root.classList.add('theme-transition');
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => root.classList.remove('theme-transition'), TRANSITION_MS);
  }
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  void setSystemBars(theme);
}

/** Aplica a preferência no documento; no automático, acompanha o tema do celular enquanto durar. */
export function applyTheme(pref: ThemePref | undefined): void {
  systemQuery ??= window.matchMedia('(prefers-color-scheme: dark)');
  if (followSystem) systemQuery.removeEventListener('change', followSystem);
  followSystem = undefined;

  paint(resolveTheme(pref, systemQuery.matches));
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref ?? 'auto');
  } catch {
    // sem localStorage o tema ainda vem do banco; só pode piscar ao abrir
  }

  if (pref === undefined || pref === 'auto') {
    const query = systemQuery;
    followSystem = () => paint(resolveTheme('auto', query.matches));
    query.addEventListener('change', followSystem);
  }
}
