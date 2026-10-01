import { describe, expect, it } from 'vitest';
import { newId, uuidFromBytes } from './id';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  it('gera UUID v4 únicos', () => {
    const a = newId();
    expect(a).toMatch(V4);
    expect(newId()).not.toBe(a);
  });
  it('monta UUID v4 a partir de bytes aleatórios (sem randomUUID)', () => {
    expect(uuidFromBytes(new Uint8Array(16).fill(255))).toMatch(V4);
  });
});
