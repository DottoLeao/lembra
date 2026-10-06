import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../../capacitor.config';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json')) as { version: string };

describe('release', () => {
  it('mantém o appId e a origem do WebView (mudar apaga os dados de quem já usa)', () => {
    expect(config.appId).toBe('com.dottoleao.lembra');
    expect(config.server).toEqual({ androidScheme: 'https', hostname: 'localhost' });
  });

  it('arquiva o iOS com identidade de distribuição (dispensa aparelho registrado)', () => {
    expect(read('.github/workflows/ios.yml')).toContain('CODE_SIGN_IDENTITY="Apple Distribution"');
  });

  it('declara no manifesto de privacidade do iOS a leitura de datas de arquivo (plugin de arquivos)', () => {
    const manifest = read('ios/App/App/PrivacyInfo.xcprivacy');
    expect(manifest).toContain('NSPrivacyAccessedAPICategoryFileTimestamp');
    expect(manifest).toContain('C617.1');
  });

  it('abertura do Android 12+ usa o tema que desenha o círculo atrás da ficha', () => {
    expect(read('android/app/src/main/res/values/styles.xml')).toContain(
      '<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen.IconBackground">',
    );
  });

  it('usa versão x.y.z numérica, como a App Store exige', () => {
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.version).not.toBe('0.1.0');
  });
});
