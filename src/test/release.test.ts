import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../../capacitor.config';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

describe('release', () => {
  it('mantém o appId e a origem do WebView (mudar apaga os dados de quem já usa)', () => {
    expect(config.appId).toBe('com.dottoleao.lembra');
    expect(config.server).toEqual({ androidScheme: 'https', hostname: 'localhost' });
  });

  it('usa versão x.y.z numérica, como a App Store exige', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.version).not.toBe('0.1.0');
  });
});
