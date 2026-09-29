import { describe, expect, it } from 'vitest';

describe('ambiente de testes', () => {
  it('tem IndexedDB simulado e crypto disponíveis', () => {
    expect(typeof indexedDB.open).toBe('function');
    expect(typeof crypto.getRandomValues).toBe('function');
  });
});
