import { describe, expect, it } from 'vitest';
import { resolveTheme } from './theme';

describe('resolveTheme', () => {
  it('automático segue o sistema', () => {
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('auto', true)).toBe('dark');
  });

  it('sem preferência salva vale como automático', () => {
    expect(resolveTheme(undefined, false)).toBe('light');
    expect(resolveTheme(undefined, true)).toBe('dark');
  });

  it('claro ignora o sistema', () => {
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('escuro ignora o sistema', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('dark', true)).toBe('dark');
  });
});
