export type ThemePref = 'auto' | 'light' | 'dark';

/** Tema efetivo: claro/escuro fixos ignoram o sistema; automático (ou ausente) segue o celular. */
export function resolveTheme(pref: ThemePref | undefined, systemDark: boolean): 'light' | 'dark' {
  if (pref === 'light' || pref === 'dark') return pref;
  return systemDark ? 'dark' : 'light';
}
