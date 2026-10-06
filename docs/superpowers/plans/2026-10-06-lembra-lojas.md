# Lembra nas lojas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o Lembra pronto para a Google Play e a App Store: marca própria no app, AAB e IPA
gerados pelo CI, ajustes do iPhone, vibração, páginas legais e todo o material das lojas.

**Architecture:** O app web (React + Vite) não muda de forma. O Capacitor ganha a plataforma iOS ao
lado da Android. As diferenças entre plataformas ficam em `src/ui/platform.ts`; só ele,
`src/ui/nativeBackupFs.ts` e o novo `src/ui/haptics.ts` falam com plugins do Capacitor. A arte
sai de `public/icon.svg` por um script; o material das lojas fica em `docs/loja/`.

**Tech Stack:** React 19, Vite 7, TypeScript 5.9, Capacitor 8 (`@capacitor/android`, `@capacitor/ios`,
`@capacitor/filesystem`, `@capacitor/status-bar`, `@capacitor/haptics`), `@capacitor/assets`,
`sharp`, Vitest 3, Playwright, GitHub Actions (ubuntu e macOS).

**Spec:** `docs/superpowers/specs/2026-10-06-lembra-lojas-design.md`

## Global Constraints

- appId / bundle ID: `com.dottoleao.lembra`. `capacitor.config.ts` → `server: { androidScheme: 'https', hostname: 'localhost' }` **não muda** (mudar apaga os dados).
- Nome no aparelho: `Lembra`. Título nas lojas: `Lembra: Flashcards`.
- Versão: `1.0.0` no `package.json`, lida pelo Android (`versionName`) e pelo iOS (`MARKETING_VERSION`).
- Cores: papel `#F3EEE4`, papel escuro `#16130F`, tinta `#1E1A16`, cartão `#FFFDF8`, terracota `#B5482A` (escuro `#E07A5A`), tinta escura `#F1EADF`, texto apagado `#6B6259` / `#A39889`.
- Fontes: Fraunces (títulos), Instrument Sans (interface).
- Só iPhone (`TARGETED_DEVICE_FAMILY = 1`), só retrato.
- Textos de interface e das lojas em pt-BR; nenhum texto cita "Anki" ou outra marca.
- O app não faz chamadas de rede. Nenhuma tarefa adiciona análise, anúncios ou conta.
- Commits sem nenhuma marca de autoria por IA (regra do autor): nada de `Co-Authored-By`, "Generated with" ou similares.
- Plugins do Capacitor só são chamados em `src/ui/platform.ts`, `src/ui/nativeBackupFs.ts` e `src/ui/haptics.ts`.

## Review Focus

1. **Quem já usa o APK atualiza pela Play e não perde dados.** A origem do WebView e o appId não podem mudar → Task 1 fixa isso num teste.
2. **Versão aceita pela Apple.** `MARKETING_VERSION` precisa ser `x.y.z` numérico, sem sufixo → Task 1 testa o formato da versão do `package.json`.
3. **Usuário do PWA abrindo `/privacidade`.** Com o service worker ativo, a página certa abre, não o app → Task 7 tem um e2e com o service worker ligado.
4. **Vibração que falha** (aparelho sem motor, plugin indisponível) não pode travar a resposta do card → Task 4 testa que a falha é engolida.
5. **Backup no iOS grava na raiz de Documentos**, onde podem existir outros arquivos, e a limpeza dos antigos não pode tocar neles → Task 3 testa a listagem e a remoção na raiz.

---

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `src/test/release.test.ts` | Trava appId, origem do WebView e formato da versão | 1 |
| `android/app/build.gradle` | `versionName` a partir do `package.json` | 1 |
| `android/app/src/main/AndroidManifest.xml` | Comentário sobre as permissões de armazenamento | 1 |
| `.github/workflows/android.yml` | APK + AAB | 1 |
| `scripts/brand-assets.mjs` | Gera os PNG-fonte a partir de `public/icon.svg` | 2 |
| `assets/*.png` | Fontes do `@capacitor/assets` | 2 |
| `android/app/src/main/res/**` | Ícones, abertura, cores | 2 |
| `src/ui/platform.ts` | `nativePlatform()` | 3 |
| `src/ui/nativeBackupFs.ts` | Pasta por plataforma | 3 |
| `src/ui/share.ts` | `savedMessage()` no lugar de `SAVED_MESSAGE` | 3 |
| `src/ui/haptics.ts` | Vibração | 4 |
| `ios/**` | Projeto iOS | 5 |
| `.github/workflows/ios.yml` | Build e envio ao TestFlight | 6 |
| `public/privacidade/index.html`, `public/suporte/index.html` | Páginas legais | 7 |
| `store/*` + `playwright.store.config.ts` | Capturas e imagem de destaque | 8 |
| `docs/loja/*.md` | Textos e respostas dos consoles | 9 |

---

### Task 1: Base de release (versão, AAB, travas)

**Files:**
- Create: `src/test/release.test.ts`
- Modify: `package.json` (campo `version`)
- Modify: `android/app/build.gradle` (bloco `defaultConfig`)
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `.github/workflows/android.yml`

**Interfaces:**
- Consumes: nada.
- Produces: `package.json` `version` = `1.0.0`, lido pelas Tasks 5 e 6.

- [ ] **Step 1: Escrever o teste que falha**

`src/test/release.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/release.test.ts`
Expected: FAIL no segundo teste (`expected '0.1.0' not to be '0.1.0'`). O primeiro passa.

- [ ] **Step 3: Subir a versão**

Em `package.json`, trocar `"version": "0.1.0"` por `"version": "1.0.0"`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/release.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: `versionName` a partir do `package.json`**

Em `android/app/build.gradle`, logo acima de `android {`, adicionar:

```groovy
// a versão mora no package.json; Android e iOS leem de lá
def appVersion = new groovy.json.JsonSlurper().parse(file('../../package.json')).version
```

e no `defaultConfig` trocar `versionName "1.0"` por:

```groovy
        versionName appVersion
```

- [ ] **Step 6: Comentário no manifesto**

Em `android/app/src/main/AndroidManifest.xml` (XML não aceita comentário dentro de uma tag), adicionar logo antes de `<application`:

```xml
    <!-- requestLegacyExternalStorage e as permissões de armazenamento abaixo são necessárias para o
         backup em Documentos/Lembra no Android 9 e 10; do 11 em diante o sistema as ignora. Não remover. -->
```

e trocar a linha `<!-- Permissions -->` por:

```xml
    <!-- Permissões (armazenamento: ver comentário acima de <application>) -->
```

- [ ] **Step 7: AAB no CI**

Em `.github/workflows/android.yml`, no passo "Compilar APK assinado", trocar o nome e o comando:

```yaml
      - name: Compilar APK e AAB assinados
        working-directory: android
        run: chmod +x gradlew && ./gradlew assembleRelease bundleRelease --no-daemon
```

(o bloco `env:` do passo continua igual). Depois do passo "Publicar na Release apk-latest", adicionar:

```yaml
      - name: Guardar AAB para a Play
        uses: actions/upload-artifact@v4
        with:
          name: lembra-aab
          path: android/app/build/outputs/bundle/release/app-release.aab
          retention-days: 30
```

- [ ] **Step 8: Conferir build web e testes**

Run: `npm run build && npm test`
Expected: build sem erro; todos os testes PASS.

Se houver Android SDK local (`ANDROID_HOME` definido), rodar também `cd android && ./gradlew bundleRelease --no-daemon` e conferir `android/app/build/outputs/bundle/release/app-release.aab`. Sem SDK local, a verificação é o CI depois do push.

- [ ] **Step 9: Commit**

```bash
git add src/test/release.test.ts package.json android/app/build.gradle android/app/src/main/AndroidManifest.xml .github/workflows/android.yml
git commit -m "build: versão 1.0.0, AAB no CI e trava da origem do WebView"
```

---

### Task 2: Ícone e abertura do Lembra no Android

**Files:**
- Create: `scripts/brand-assets.mjs`
- Create: `assets/icon-only.png`, `assets/icon-foreground.png`, `assets/icon-background.png`, `assets/splash.png`, `assets/splash-dark.png` (gerados)
- Create: `docs/loja/arte/play-icone.png` (gerado)
- Create: `android/app/src/main/res/values/colors.xml`, `android/app/src/main/res/values-night/colors.xml`
- Modify: `android/app/src/main/res/values/styles.xml`
- Modify (gerados): `android/app/src/main/res/mipmap-*/*`, `android/app/src/main/res/drawable*/splash.png`
- Modify: `package.json` (devDependencies e script `assets`)

**Interfaces:**
- Consumes: `public/icon.svg`.
- Produces: script `npm run assets` (a Task 5 roda de novo com `--ios`); `assets/*.png`.

- [ ] **Step 1: Instalar as ferramentas**

Run: `npm install -D @capacitor/assets sharp`
Expected: as duas entram em `devDependencies`.

- [ ] **Step 2: Escrever o script de arte**

`scripts/brand-assets.mjs`:

```js
// Gera as imagens-fonte da marca a partir de public/icon.svg (a única fonte do desenho).
import { mkdirSync, readFileSync } from 'node:fs';
import sharp from 'sharp';

const svg = readFileSync('public/icon.svg', 'utf8');
const INK = '#1E1A16';

// o desenho da ficha, sem o quadrado de fundo
const card = svg.replace(/<rect width="512" height="512" rx="112" fill="#1E1A16"\/>/, '');
if (card === svg) throw new Error('public/icon.svg mudou: atualize scripts/brand-assets.mjs');
const inner = card.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

const wrap = (body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${bg ? `<rect width="512" height="512" fill="${bg}"/>` : ''}${body}</svg>`;
// encolhe a ficha para caber no círculo seguro de 66% do ícone adaptativo
const safe = `<g transform="translate(256 256) scale(0.82) translate(-256 -256)">${inner}</g>`;

const png = (s, size) => sharp(Buffer.from(s), { density: 384 }).resize(size, size).png();

mkdirSync('assets', { recursive: true });
mkdirSync('docs/loja/arte', { recursive: true });

// iOS e lojas: quadrado cheio, sem cantos e sem transparência (o sistema arredonda)
await png(wrap(inner, INK), 1024).flatten({ background: INK }).toFile('assets/icon-only.png');
await png(wrap(inner, INK), 512).flatten({ background: INK }).toFile('docs/loja/arte/play-icone.png');
// Android adaptativo
await png(wrap(safe), 1024).toFile('assets/icon-foreground.png');
await png(wrap('', INK), 1024).toFile('assets/icon-background.png');

// abertura: o ícone arredondado no centro, sobre o papel
async function splash(bg, out) {
  const icon = await png(svg, 600).toBuffer();
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: bg } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(out);
}
await splash('#F3EEE4', 'assets/splash.png');
await splash('#16130F', 'assets/splash-dark.png');

console.log('arte gerada em assets/ e docs/loja/arte/');
```

- [ ] **Step 3: Script no `package.json`**

Em `scripts`, adicionar:

```json
    "assets": "node scripts/brand-assets.mjs && capacitor-assets generate --android"
```

- [ ] **Step 4: Gerar e conferir**

Run: `npm run assets`
Expected: "arte gerada…" e o `capacitor-assets` listando os arquivos Android escritos.

Abrir com a ferramenta de leitura de imagem e conferir:
- `assets/icon-only.png`: quadrado escuro inteiro, ficha clara inclinada, linha terracota, sem cantos arredondados.
- `assets/icon-foreground.png`: só a ficha, fundo transparente, com folga nas bordas.
- `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png`: **a ficha, não o "X" azul**.
- `android/app/src/main/res/drawable-port-xxxhdpi/splash.png`: papel com o ícone no centro.

- [ ] **Step 5: Cores e abertura do Android 12+**

`android/app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="lembra_paper">#F3EEE4</color>
    <color name="lembra_ink">#1E1A16</color>
</resources>
```

`android/app/src/main/res/values-night/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="lembra_paper">#16130F</color>
</resources>
```

Em `android/app/src/main/res/values/styles.xml`, trocar o estilo `AppTheme.NoActionBarLaunch` por:

```xml
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <!-- Android 12+: abertura do sistema com a ficha sobre o papel -->
        <item name="windowSplashScreenBackground">@color/lembra_paper</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
        <item name="windowSplashScreenIconBackgroundColor">@color/lembra_ink</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>
```

Se o `capacitor-assets` tiver criado `values/colors.xml` ou outro arquivo com cores próprias, juntar as cores num só `colors.xml` (nomes de recurso não podem repetir).

- [ ] **Step 6: Conferir que o projeto continua íntegro**

Run: `npx cap sync android && npm test`
Expected: sync sem erro; testes PASS.

Com Android SDK local: `cd android && ./gradlew assembleDebug --no-daemon` deve compilar. Sem SDK: a verificação é o APK do CI, instalado pelo autor (ícone na tela inicial e abertura nos temas claro e escuro).

- [ ] **Step 7: Commit**

```bash
git add scripts/brand-assets.mjs assets docs/loja/arte/play-icone.png android/app/src/main/res package.json package-lock.json
git commit -m "feat: ícone e abertura do Lembra no app Android"
```

---

### Task 3: Plataforma e pasta do backup por sistema

**Files:**
- Modify: `src/ui/platform.ts`
- Modify: `src/ui/nativeBackupFs.ts`
- Modify: `src/ui/share.ts`
- Modify: `src/ui/share.test.ts` (mock de `./platform`)
- Modify: `src/ui/components/ErrorScreen.tsx:4,11`, `src/ui/screens/Deck.tsx:16,69`, `src/ui/screens/Settings.tsx:11,69`, `src/ui/screens/Today.tsx:13,50`
- Create: `src/ui/nativeBackupFs.test.ts`, `src/ui/savedMessage.test.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces:
  - `nativePlatform(): 'android' | 'ios' | 'web'` em `src/ui/platform.ts` (usado pela Task 4 só por meio de `isNativeApp`).
  - `savedMessage(): string` em `src/ui/share.ts`, que substitui a constante `SAVED_MESSAGE`.
  - `saveToDocuments(name, data): Promise<string>` mantém a assinatura.

- [ ] **Step 1: Testes que falham — backup**

`src/ui/nativeBackupFs.test.ts`:

```ts
import { Filesystem } from '@capacitor/filesystem';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nativePlatform } from './platform';
import { nativeBackupFs, saveToDocuments } from './nativeBackupFs';

vi.mock('./platform', () => ({ nativePlatform: vi.fn() }));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Documents: 'DOCUMENTS' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: {
    checkPermissions: vi.fn(async () => ({ publicStorage: 'granted' })),
    requestPermissions: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    deleteFile: vi.fn(),
  },
}));

const platform = vi.mocked(nativePlatform);
const fs = vi.mocked(Filesystem);

beforeEach(() => vi.clearAllMocks());

describe('no Android', () => {
  beforeEach(() => platform.mockReturnValue('android'));

  it('grava em Documentos/Lembra', async () => {
    expect(await saveToDocuments('a.json', '{}')).toBe('Documentos/Lembra/a.json');
    expect(fs.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'Lembra/a.json', directory: 'DOCUMENTS' }));
  });

  it('lista e apaga dentro de Lembra', async () => {
    fs.readdir.mockResolvedValue({ files: [{ name: 'lembra-backup-2026-10-01.json' }] } as never);
    expect(await nativeBackupFs.list()).toEqual(['lembra-backup-2026-10-01.json']);
    expect(fs.readdir).toHaveBeenCalledWith({ path: 'Lembra', directory: 'DOCUMENTS' });
    await nativeBackupFs.remove('lembra-backup-2026-10-01.json');
    expect(fs.deleteFile).toHaveBeenCalledWith({ path: 'Lembra/lembra-backup-2026-10-01.json', directory: 'DOCUMENTS' });
  });
});

describe('no iPhone', () => {
  beforeEach(() => platform.mockReturnValue('ios'));

  it('grava na raiz de Documentos, que o app Arquivos mostra como Lembra', async () => {
    expect(await saveToDocuments('a.json', '{}')).toBe('Arquivos › No meu iPhone › Lembra/a.json');
    expect(fs.writeFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'a.json', directory: 'DOCUMENTS' }));
  });

  it('lista a raiz (com outros arquivos) e apaga só o nome pedido', async () => {
    fs.readdir.mockResolvedValue({ files: [{ name: 'lembra-backup-2026-10-01.json' }, { name: 'capitais.json' }] } as never);
    expect(await nativeBackupFs.list()).toEqual(['lembra-backup-2026-10-01.json', 'capitais.json']);
    expect(fs.readdir).toHaveBeenCalledWith({ path: '', directory: 'DOCUMENTS' });
    await nativeBackupFs.remove('lembra-backup-2026-10-01.json');
    expect(fs.deleteFile).toHaveBeenCalledWith({ path: 'lembra-backup-2026-10-01.json', directory: 'DOCUMENTS' });
  });
});
```

(Que a limpeza ignora `capitais.json` já é garantido por `filesToDelete`, testado em `src/domain/autoBackup.test.ts`.)

- [ ] **Step 2: Testes que falham — mensagem**

`src/ui/savedMessage.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { nativePlatform } from './platform';
import { savedMessage } from './share';

vi.mock('./platform', () => ({ isNativeApp: () => true, nativePlatform: vi.fn() }));
// módulo real (visibleFolder decide a pasta), com o plugin de arquivos neutralizado
vi.mock('@capacitor/filesystem', () => ({ Directory: {}, Encoding: {}, Filesystem: {} }));

describe('savedMessage', () => {
  it('aponta Documentos/Lembra no Android', () => {
    vi.mocked(nativePlatform).mockReturnValue('android');
    expect(savedMessage()).toBe('Salvo em Documentos/Lembra');
  });

  it('aponta o app Arquivos no iPhone', () => {
    vi.mocked(nativePlatform).mockReturnValue('ios');
    expect(savedMessage()).toBe('Salvo em Arquivos › No meu iPhone › Lembra');
  });
});
```

Em `src/ui/share.test.ts`, trocar o mock de `./platform` por:

```ts
vi.mock('./platform', () => ({ isNativeApp: () => true, nativePlatform: () => 'android' }));
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/ui`
Expected: FAIL (`nativePlatform`/`savedMessage` não existem; caminhos do iOS errados).

- [ ] **Step 4: Implementar `nativePlatform`**

Em `src/ui/platform.ts`, trocar o comentário e a função `isNativeApp` por:

```ts
export type NativePlatform = 'android' | 'ios' | 'web';

/** Em que sistema o app está rodando ('web' no navegador). */
export function nativePlatform(): NativePlatform {
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios' ? p : 'web';
}

/** Verdadeiro dentro do app instalado (Android ou iPhone); falso no navegador. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
```

e trocar o comentário de `setSystemBars` por:

```ts
/** No app, deixa os ícones da barra de status legíveis e, no Android, pinta o fundo com o papel. */
```

(o `setBackgroundColor` não existe no iOS; a falha já cai no `catch`. Para não depender disso, envolver só essa linha:)

```ts
    if (nativePlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#16130F' : '#F3EEE4' });
    }
```

- [ ] **Step 5: Pasta por plataforma**

Substituir o começo de `src/ui/nativeBackupFs.ts` (constante `FOLDER` até o fim de `saveToDocuments`) e os caminhos de `nativeBackupFs`:

```ts
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import type { BackupFs } from '../data/autoBackup';
import { nativePlatform } from './platform';

// Android: Documentos/Lembra. iPhone: a raiz de Documentos do app, que o Arquivos mostra como "Lembra".
const folder = () => (nativePlatform() === 'ios' ? '' : 'Lembra');
const pathOf = (name: string) => (folder() ? `${folder()}/${name}` : name);

/** Caminho que o usuário enxerga, para mostrar na tela. */
export function visibleFolder(): string {
  return nativePlatform() === 'ios' ? 'Arquivos › No meu iPhone › Lembra' : 'Documentos/Lembra';
}

async function ensurePermission(): Promise<void> {
  const status = await Filesystem.checkPermissions();
  if (status.publicStorage !== 'granted') await Filesystem.requestPermissions();
}

async function writeToFolder(name: string, data: string): Promise<void> {
  await ensurePermission();
  await Filesystem.writeFile({
    path: pathOf(name),
    data,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

/** Salva um arquivo exportado na pasta do Lembra; devolve o caminho para mostrar ao usuário. */
export async function saveToDocuments(name: string, data: string): Promise<string> {
  await writeToFolder(name, data);
  return `${visibleFolder()}/${name}`;
}

export const nativeBackupFs: BackupFs = {
  async list() {
    try {
      const result = await Filesystem.readdir({ path: folder(), directory: Directory.Documents });
      return result.files.map((f) => f.name);
    } catch {
      return []; // pasta ainda não existe
    }
  },
  write: writeToFolder,
  async remove(name) {
    await Filesystem.deleteFile({ path: pathOf(name), directory: Directory.Documents });
  },
};
```

- [ ] **Step 6: `savedMessage` no lugar de `SAVED_MESSAGE`**

Em `src/ui/share.ts`:

```ts
import { saveToDocuments, visibleFolder } from './nativeBackupFs';
import { isNativeApp } from './platform';

export type ShareResult = 'shared' | 'downloaded' | 'saved' | 'cancelled';

/** Mensagem depois de salvar no app, com a pasta de cada sistema. */
export function savedMessage(): string {
  return `Salvo em ${visibleFolder()}`;
}

/** No app grava na pasta do Lembra ('saved'); na web compartilha ou baixa. */
```

(remover a linha `export const SAVED_MESSAGE = …`). Como `share.ts` agora importa `visibleFolder`, o mock de `./nativeBackupFs` em `src/ui/share.test.ts` passa a ser parcial (mantém o módulo real e troca só `saveToDocuments`), com o plugin neutralizado:

```ts
vi.mock('./nativeBackupFs', async (orig) => ({ ...(await orig<typeof import('./nativeBackupFs')>()), saveToDocuments: vi.fn() }));
vi.mock('@capacitor/filesystem', () => ({ Directory: {}, Encoding: {}, Filesystem: {} }));
```

Nos quatro usos, trocar o import `SAVED_MESSAGE` por `savedMessage` e o uso por chamada:
- `src/ui/components/ErrorScreen.tsx:11` → `` `${savedMessage()}.` ``
- `src/ui/screens/Deck.tsx:69` → `toast({ message: savedMessage() })`
- `src/ui/screens/Settings.tsx:69` → `result === 'saved' ? savedMessage() : 'Backup exportado'`
- `src/ui/screens/Today.tsx:50` → igual ao de Settings.

- [ ] **Step 7: Rodar e ver passar**

Run: `npx tsc --noEmit && npx vitest run`
Expected: sem erro de tipo; todos PASS.

Run: `npx playwright test e2e/settings.spec.ts e2e/deck.spec.ts`
Expected: PASS (na web nada mudou).

- [ ] **Step 8: Commit**

```bash
git add src/ui
git commit -m "feat: backup e mensagem de arquivo salvo com a pasta certa no Android e no iPhone"
```

---

### Task 4: Vibração leve

**Files:**
- Create: `src/ui/haptics.ts`, `src/ui/haptics.test.ts`
- Modify: `src/ui/screens/Study.tsx` (função `answer`, ~linha 81)
- Modify: `src/ui/screens/SessionEnd.tsx`
- Modify: `package.json` (dependência)

**Interfaces:**
- Consumes: `isNativeApp()` de `src/ui/platform.ts`; `Rating` de `src/domain/types.ts` (`1 | 2 | 3 | 4`).
- Produces: `answerHaptic(rating: Rating): Promise<void>`, `sessionEndHaptic(): Promise<void>`.

- [ ] **Step 1: Instalar o plugin**

Run: `npm install @capacitor/haptics@^8`

- [ ] **Step 2: Teste que falha**

`src/ui/haptics.test.ts`:

```ts
import { Haptics } from '@capacitor/haptics';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { answerHaptic, sessionEndHaptic } from './haptics';
import { isNativeApp } from './platform';

vi.mock('./platform', () => ({ isNativeApp: vi.fn() }));
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(async () => {}), notification: vi.fn(async () => {}) },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM' },
  NotificationType: { Success: 'SUCCESS' },
}));

const native = vi.mocked(isNativeApp);
const h = vi.mocked(Haptics);

beforeEach(() => {
  vi.clearAllMocks();
  native.mockReturnValue(true);
});

describe('answerHaptic', () => {
  it.each([1, 2, 3] as const)('resposta %i vibra leve', async (r) => {
    await answerHaptic(r);
    expect(h.impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });

  it('Fácil vibra um pouco mais', async () => {
    await answerHaptic(4);
    expect(h.impact).toHaveBeenCalledWith({ style: 'MEDIUM' });
  });

  it('não faz nada na web', async () => {
    native.mockReturnValue(false);
    await answerHaptic(3);
    expect(h.impact).not.toHaveBeenCalled();
  });

  it('engole a falha do plugin (não pode travar a resposta)', async () => {
    h.impact.mockRejectedValueOnce(new Error('sem motor'));
    await expect(answerHaptic(3)).resolves.toBeUndefined();
  });
});

describe('sessionEndHaptic', () => {
  it('vibra como sucesso', async () => {
    await sessionEndHaptic();
    expect(h.notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
  });

  it('engole a falha do plugin', async () => {
    h.notification.mockRejectedValueOnce(new Error('x'));
    await expect(sessionEndHaptic()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/ui/haptics.test.ts`
Expected: FAIL (`Cannot find module './haptics'`).

- [ ] **Step 4: Implementar**

`src/ui/haptics.ts`:

```ts
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { Rating } from '../domain/types';
import { isNativeApp } from './platform';

// vibração é cosmética: nunca pode atrasar ou quebrar o estudo
async function safely(fn: () => Promise<void>): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await fn();
  } catch {
    // aparelho sem motor de vibração ou plugin indisponível: segue sem vibrar
  }
}

/** Toque leve ao responder; Fácil um pouco mais marcado. */
export function answerHaptic(rating: Rating): Promise<void> {
  return safely(() => Haptics.impact({ style: rating === 4 ? ImpactStyle.Medium : ImpactStyle.Light }));
}

/** Vibração de sucesso ao terminar a sessão. */
export function sessionEndHaptic(): Promise<void> {
  return safely(() => Haptics.notification({ type: NotificationType.Success }));
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/ui/haptics.test.ts`
Expected: PASS (8 testes).

- [ ] **Step 6: Ligar no estudo e no fim da sessão**

Em `src/ui/screens/Study.tsx`, importar `import { answerHaptic } from '../haptics';` e, em `answer()`, logo depois de `busy.current = true;` e antes do `try`:

```ts
    void answerHaptic(rating); // vale para o botão e para o gesto de arrastar
```

Em `src/ui/screens/SessionEnd.tsx`, importar `useEffect` de `react` e `sessionEndHaptic` de `../haptics`, e logo no começo do componente, antes de `const data = …`:

```ts
  useEffect(() => {
    void sessionEndHaptic();
  }, []);
```

(o `useEffect` fica antes do `return <Navigate …>` para respeitar a ordem dos hooks.)

- [ ] **Step 7: Conferir**

Run: `npx tsc --noEmit && npx vitest run && npx playwright test e2e/study.spec.ts`
Expected: tudo PASS (na web a vibração não faz nada).

- [ ] **Step 8: Commit**

```bash
git add src/ui/haptics.ts src/ui/haptics.test.ts src/ui/screens/Study.tsx src/ui/screens/SessionEnd.tsx package.json package-lock.json
git commit -m "feat: vibração leve ao responder e ao terminar a sessão no app"
```

---

### Task 5: Projeto iOS

**Files:**
- Create: `ios/**` (gerado pelo Capacitor)
- Modify: `ios/App/App/Info.plist`
- Modify: `ios/App/App.xcodeproj/project.pbxproj`
- Create: `ios/App/App/PrivacyInfo.xcprivacy`
- Create: `ios/ExportOptions.plist`
- Modify: `package.json` (dependência e script `assets`)

**Interfaces:**
- Consumes: `assets/*.png` e o script `assets` (Task 2); versão do `package.json` (Task 1).
- Produces: projeto em `ios/App/` com esquema `App`, usado pela Task 6; `ios/ExportOptions.plist`.

- [ ] **Step 1: Adicionar a plataforma**

Run: `npm install @capacitor/ios@^8 && npm run build && npx cap add ios`
Expected: pasta `ios/App/` criada. O Capacitor 8 usa Swift Package Manager, então deve funcionar no Windows (avisa que não pode abrir o Xcode).

**Se o comando recusar rodar fora do macOS:** criar `.github/workflows/ios-scaffold.yml` (só `workflow_dispatch`, `runs-on: macos-latest`, passos `checkout` → `setup-node 24` → `npm ci` → `npm run build` → `npx cap add ios` → `actions/upload-artifact` da pasta `ios`), pedir ao autor para disparar, baixar o artefato com `gh run download`, colocar em `ios/` e apagar esse workflow no mesmo commit.

- [ ] **Step 2: Conferir o que foi gerado**

Run: `ls ios/App ios/App/App && grep -n "TARGETED_DEVICE_FAMILY\|PRODUCT_BUNDLE_IDENTIFIER\|PrivacyInfo" ios/App/App.xcodeproj/project.pbxproj`
Expected: `App.xcodeproj` (ou também `App.xcworkspace`, se tiver gerado com CocoaPods), `Info.plist`, `PRODUCT_BUNDLE_IDENTIFIER = com.dottoleao.lembra`. Anotar se já existe `PrivacyInfo.xcprivacy` (Step 5).

- [ ] **Step 3: Só iPhone**

Em `ios/App/App.xcodeproj/project.pbxproj`, trocar todas as ocorrências de `TARGETED_DEVICE_FAMILY = "1,2";` por `TARGETED_DEVICE_FAMILY = 1;`.

Run: `grep -c 'TARGETED_DEVICE_FAMILY = 1;' ios/App/App.xcodeproj/project.pbxproj`
Expected: 2 (Debug e Release).

- [ ] **Step 4: `Info.plist`**

Em `ios/App/App/Info.plist`, dentro do `<dict>` principal:

1. Conferir `CFBundleDisplayName` = `Lembra` (o Capacitor usa o `appName`).
2. Substituir o array `UISupportedInterfaceOrientations` por só retrato, e apagar `UISupportedInterfaceOrientations~ipad` se existir:

```xml
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
	</array>
```

3. Adicionar antes do `</dict>` final:

```xml
	<!-- backups aparecem no app Arquivos em "No meu iPhone › Lembra" -->
	<key>UIFileSharingEnabled</key>
	<true/>
	<key>LSSupportsOpeningDocumentsInPlace</key>
	<true/>
	<!-- só usa a criptografia do sistema: a Apple não pergunta a cada build -->
	<key>ITSAppUsesNonExemptEncryption</key>
	<false/>
```

- [ ] **Step 5: Manifesto de privacidade**

Se o Step 2 mostrou que o template já traz `PrivacyInfo.xcprivacy` no target, só substituir o conteúdo. Senão, criar `ios/App/App/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSPrivacyTracking</key>
	<false/>
	<key>NSPrivacyTrackingDomains</key>
	<array/>
	<key>NSPrivacyCollectedDataTypes</key>
	<array/>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>
				<string>CA92.1</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
```

e registrá-lo no target `App` em `project.pbxproj`, copiando o padrão que o arquivo já usa para `Info.plist`/`config.xml`, com dois IDs novos de 24 caracteres hexadecimais que não existam no arquivo (conferir com `grep`), por exemplo `4C1E6B2A2E9F000100A1B2C3` (referência) e `4C1E6B2A2E9F000200A1B2C3` (build):

```
/* na seção PBXBuildFile */
		4C1E6B2A2E9F000200A1B2C3 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = 4C1E6B2A2E9F000100A1B2C3 /* PrivacyInfo.xcprivacy */; };
/* na seção PBXFileReference */
		4C1E6B2A2E9F000100A1B2C3 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };
```

Depois, incluir `4C1E6B2A2E9F000100A1B2C3 /* PrivacyInfo.xcprivacy */,` na lista `children` do grupo `App` (o mesmo que lista `Info.plist`), e `4C1E6B2A2E9F000200A1B2C3 /* PrivacyInfo.xcprivacy in Resources */,` na lista `files` da `PBXResourcesBuildPhase` do target `App`. A Task 6 valida isso de verdade (o build no macOS falha se o pbxproj estiver quebrado).

- [ ] **Step 6: Ícone e abertura do iOS**

Em `package.json`, trocar o script `assets` por:

```json
    "assets": "node scripts/brand-assets.mjs && capacitor-assets generate --android --ios"
```

Run: `npm run assets`
Expected: arquivos escritos em `ios/App/App/Assets.xcassets/AppIcon.appiconset/` e `Splash.imageset/`. Abrir o `AppIcon-512@2x.png` gerado e conferir que é o ícone do Lembra, quadrado e sem transparência.

- [ ] **Step 7: Opções de exportação**

`ios/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store-connect</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>destination</key>
	<string>export</string>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
```

- [ ] **Step 8: Sincronizar e conferir**

Run: `npx cap sync && npm test`
Expected: sync das duas plataformas sem erro (o iOS lista `@capacitor/filesystem`, `@capacitor/haptics`, `@capacitor/status-bar`); testes PASS.

Conferir que `ios/.gitignore` (gerado) ignora `App/build`, `DerivedData` e `App/App/public`.

- [ ] **Step 9: Commit**

```bash
git add ios package.json package-lock.json
git commit -m "feat: projeto iOS (só iPhone, retrato, backup no Arquivos, manifesto de privacidade)"
```

---

### Task 6: Build iOS e envio ao TestFlight pelo CI

**Files:**
- Create: `.github/workflows/ios.yml`

**Interfaces:**
- Consumes: `ios/App` com esquema `App` e `ios/ExportOptions.plist` (Task 5); `package.json` `version` (Task 1).
- Produces: build no TestFlight. Segredos que o autor cadastra: `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_P8` (base64 do `.p8`); variável de repositório `APPLE_TEAM_ID` (não é segredo; aparece em Membership no site da Apple Developer).

- [ ] **Step 1: Escrever o workflow**

`.github/workflows/ios.yml`:

```yaml
name: iOS TestFlight

on:
  workflow_dispatch:

jobs:
  ios:
    runs-on: macos-latest
    env:
      KEY_ID: ${{ secrets.APP_STORE_CONNECT_KEY_ID }}
      ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
      KEY_P8: ${{ secrets.APP_STORE_CONNECT_KEY_P8 }}
      TEAM_ID: ${{ vars.APPLE_TEAM_ID }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Conferir segredos
        run: |
          for v in KEY_ID ISSUER_ID KEY_P8 TEAM_ID; do
            test -n "${!v}" || { echo "::error::$v ausente (ver docs/loja/passo-a-passo.md)"; exit 1; }
          done

      - run: npm ci
      - run: npm run build
      - run: npx cap sync ios

      - name: Chave da API da App Store Connect
        run: |
          mkdir -p ~/.appstoreconnect/private_keys
          echo "$KEY_P8" | base64 -d > ~/.appstoreconnect/private_keys/AuthKey_$KEY_ID.p8
          echo "KEY_PATH=$HOME/.appstoreconnect/private_keys/AuthKey_$KEY_ID.p8" >> "$GITHUB_ENV"

      - name: Arquivar
        working-directory: ios/App
        run: |
          if [ -d App.xcworkspace ]; then TARGET="-workspace App.xcworkspace"; else TARGET="-project App.xcodeproj"; fi
          xcodebuild $TARGET -scheme App -configuration Release \
            -destination 'generic/platform=iOS' \
            -archivePath "$RUNNER_TEMP/Lembra.xcarchive" \
            -allowProvisioningUpdates \
            -authenticationKeyPath "$KEY_PATH" \
            -authenticationKeyID "$KEY_ID" \
            -authenticationKeyIssuerID "$ISSUER_ID" \
            DEVELOPMENT_TEAM="$TEAM_ID" CODE_SIGN_STYLE=Automatic \
            CURRENT_PROJECT_VERSION="${{ github.run_number }}" \
            MARKETING_VERSION="$(node -p "require('../../package.json').version")" \
            archive

      - name: Exportar IPA
        run: |
          xcodebuild -exportArchive \
            -archivePath "$RUNNER_TEMP/Lembra.xcarchive" \
            -exportOptionsPlist ios/ExportOptions.plist \
            -exportPath "$RUNNER_TEMP/export" \
            -allowProvisioningUpdates \
            -authenticationKeyPath "$KEY_PATH" \
            -authenticationKeyID "$KEY_ID" \
            -authenticationKeyIssuerID "$ISSUER_ID"

      - name: Enviar ao TestFlight
        run: |
          xcrun altool --upload-app -t ios -f "$RUNNER_TEMP"/export/*.ipa \
            --apiKey "$KEY_ID" --apiIssuer "$ISSUER_ID"
```

- [ ] **Step 2: Validar a sintaxe localmente**

Run: `npx --yes @action-validator/cli .github/workflows/ios.yml`
Expected: sem erro de esquema do GitHub Actions. (A validação real é a execução no GitHub.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ios.yml
git commit -m "ci: build iOS e envio ao TestFlight pelo runner macOS"
```

- [ ] **Step 4: Primeira execução (depende do autor)**

Quando o autor tiver cadastrado os segredos e a variável (`docs/loja/passo-a-passo.md`, Task 9) e criado o registro do app no App Store Connect: depois do push, disparar com `gh workflow run ios.yml` e acompanhar com `gh run watch`. Esta execução é de depuração: ler o log do `xcodebuild` em cada falha, corrigir no repositório, repetir. Pronto quando o passo "Enviar ao TestFlight" termina com `No errors uploading`.

---

### Task 7: Páginas de privacidade e suporte

**Precondição:** o e-mail de contato do app precisa existir. Se o autor ainda não informou o endereço, **perguntar antes de começar** e não usar endereço inventado. Nos trechos abaixo, `CONTATO` representa esse endereço: escrever o endereço real nos arquivos.

**Files:**
- Create: `public/privacidade/index.html`, `public/suporte/index.html`
- Modify: `vite.config.ts` (bloco `workbox`)
- Create: `e2e/legal.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: URLs `https://<domínio da Vercel>/privacidade` e `/suporte`, usadas nos consoles (Task 9).

- [ ] **Step 1: e2e que falha**

`e2e/legal.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const EMAIL = 'CONTATO';

for (const [path, title] of [['/privacidade', 'Política de privacidade'], ['/suporte', 'Suporte']] as const) {
  test(`${path} abre a página com título e contato`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`);
  });
}

test.describe('com o PWA instalado', () => {
  test.use({ serviceWorkers: 'allow' });

  test('o service worker não troca /privacidade pelo app', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload(); // agora a página é controlada pelo service worker
    await page.goto('/privacidade');
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeVisible();
    await expect(page.locator('#root')).toHaveCount(0);
  });
});

test('páginas legíveis no tema escuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/privacidade');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(22, 19, 15)');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/legal.spec.ts`
Expected: FAIL (as rotas abrem o app ou dão 404).

- [ ] **Step 3: Fontes do app para as páginas**

Run: `mkdir -p public/fonts && cp node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2 public/fonts/fraunces.woff2 && cp node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff2 public/fonts/instrument-sans.woff2`

(Ficam em `public/fonts/` porque as fontes do app saem com nome de hash no build e não podem ser referenciadas de uma página estática.)

- [ ] **Step 4: Página de privacidade**

`public/privacidade/index.html` (o bloco `<style>` é o mesmo nas duas páginas):

```html
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Política de privacidade · Lembra</title>
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
  <style>
    :root { color-scheme: light dark; --paper: #f3eee4; --card: #fffdf8; --ink: #1e1a16; --muted: #6b6259; --accent: #b5482a; --line: #e4dccd; }
    @media (prefers-color-scheme: dark) {
      :root { --paper: #16130f; --card: #26211b; --ink: #f1eadf; --muted: #a39889; --accent: #e07a5a; --line: #3a332b; }
    }
    @font-face { font-family: Fraunces; src: url(/fonts/fraunces.woff2) format('woff2'); font-weight: 100 900; font-display: swap; }
    @font-face { font-family: 'Instrument Sans'; src: url(/fonts/instrument-sans.woff2) format('woff2'); font-weight: 400; font-display: swap; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--paper); color: var(--ink); font: 17px/1.6 'Instrument Sans', system-ui, sans-serif; }
    main { max-width: 680px; margin: 0 auto; padding: 40px 16px 64px; }
    .brand { display: flex; align-items: center; gap: 10px; color: var(--muted); text-decoration: none; font-weight: 600; }
    .brand img { width: 32px; height: 32px; }
    h1 { font-family: Fraunces, Georgia, serif; font-size: 34px; line-height: 1.2; margin: 28px 0 4px; }
    h2 { font-family: Fraunces, Georgia, serif; font-size: 21px; margin: 32px 0 6px; }
    .meta { color: var(--muted); margin: 0 0 24px; }
    section { background: var(--card); border: 1px solid var(--line); border-top: 4px solid var(--accent); border-radius: 14px; padding: 4px 20px 16px; }
    a { color: var(--accent); }
  </style>
</head>
<body>
  <main>
    <a class="brand" href="/"><img src="/icon.svg" alt="" />Lembra</a>
    <h1>Política de privacidade</h1>
    <p class="meta">Em vigor desde 6 de outubro de 2026.</p>
    <section>
      <h2>Resumo</h2>
      <p>O Lembra não coleta, não envia e não compartilha dados pessoais. Não tem conta, análise de uso nem anúncios.</p>
      <h2>Onde ficam os seus dados</h2>
      <p>Baralhos, cards e o seu progresso ficam só no seu aparelho. O app funciona sem internet e não manda nada para servidores.</p>
      <h2>Backups</h2>
      <p>Os backups são arquivos JSON gravados no próprio aparelho: em Documentos/Lembra no Android e no app Arquivos (No meu iPhone › Lembra) no iPhone. Eles só saem do aparelho se você mesmo os compartilhar.</p>
      <p>O backup do próprio Android ou o iCloud podem incluir os dados do app, conforme os ajustes do seu aparelho. Isso é feito pelo sistema, não pelo Lembra.</p>
      <h2>Apagar os dados</h2>
      <p>Apagar o app apaga os dados dele. Os arquivos de backup continuam no aparelho até você apagá-los.</p>
      <h2>Crianças</h2>
      <p>O Lembra não coleta dados de ninguém, inclusive de crianças.</p>
      <h2>Mudanças</h2>
      <p>Se esta política mudar, a nova versão será publicada nesta página, com a data atualizada.</p>
      <h2>Contato</h2>
      <p><a href="mailto:CONTATO">CONTATO</a></p>
    </section>
  </main>
</body>
</html>
```

- [ ] **Step 5: Página de suporte**

`public/suporte/index.html`: mesmo `<head>` (trocar o `<title>` por `Suporte · Lembra`) e o mesmo `<style>`, com este `<main>`:

```html
  <main>
    <a class="brand" href="/"><img src="/icon.svg" alt="" />Lembra</a>
    <h1>Suporte</h1>
    <p class="meta">Dúvidas, problemas ou ideias: escreva para <a href="mailto:CONTATO">CONTATO</a>.</p>
    <section>
      <h2>Como faço backup?</h2>
      <p>No app, o backup automático roda todo dia e guarda os 7 mais recentes: em Documentos/Lembra no Android e no app Arquivos (No meu iPhone › Lembra) no iPhone. Para um backup na hora, abra Ajustes › Exportar tudo.</p>
      <h2>Como restauro um backup ou passo para outro celular?</h2>
      <p>Leve o arquivo de backup para o celular novo (por e-mail, nuvem ou cabo). No Lembra, abra Importar › Abrir arquivo e escolha o arquivo.</p>
      <h2>Por que não aparecem mais cards novos hoje?</h2>
      <p>O Lembra monta a fila do dia no tamanho dos minutos que você escolheu, e segura os cards novos enquanto há revisões atrasadas. Para estudar mais, toque em "Estudar mais 10 novos" no fim da sessão ou aumente os minutos em Ajustes.</p>
      <h2>Como crio cards com uma IA?</h2>
      <p>Abra Importar › Copiar prompt para IA, cole o prompt na IA que preferir junto com o assunto, copie a resposta e cole no Lembra. Confira a prévia e toque em Importar.</p>
    </section>
  </main>
```

- [ ] **Step 6: Service worker não engole as rotas**

Em `vite.config.ts`, no objeto `workbox`:

```ts
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        // páginas estáticas do site: quem já tem o PWA precisa ver a página, não o app
        navigateFallbackDenylist: [/^\/privacidade/, /^\/suporte/],
      },
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx playwright test e2e/legal.spec.ts e2e/pwa.spec.ts`
Expected: PASS. Se o teste do service worker falhar porque o `preview` não serve `/privacidade` sem barra final, mudar o `page.goto` para `/privacidade/` **e** conferir na Vercel depois do deploy que `/privacidade` (sem barra) abre a página; se não abrir, criar `vercel.json` com `{ "trailingSlash": false, "cleanUrls": true }`.

- [ ] **Step 8: Commit**

```bash
git add public/fonts public/privacidade public/suporte vite.config.ts e2e/legal.spec.ts
git commit -m "feat: páginas de privacidade e suporte no site"
```

---

### Task 8: Capturas de tela e imagem de destaque

**Files:**
- Create: `playwright.store.config.ts`
- Create: `store/screenshots.spec.ts`
- Create: `store/frame.ts`
- Create (gerados): `docs/loja/arte/play-01..05.png`, `docs/loja/arte/ios-01..05.png`, `docs/loja/arte/play-destaque.png`
- Modify: `package.json` (script `screenshots`)

**Interfaces:**
- Consumes: `openApp`, `createDeck`, `createCards` de `e2e/helpers.ts`.
- Produces: as 11 imagens listadas na seção 2.3 da spec.

- [ ] **Step 1: Config separada (fora da suíte normal)**

`playwright.store.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'store',
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'pt-BR',
    colorScheme: 'light',
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
```

Em `package.json` → `scripts`: `"screenshots": "playwright test -c playwright.store.config.ts"`.

- [ ] **Step 2: Moldura com legenda**

`store/frame.ts`:

```ts
import { readFileSync } from 'node:fs';
import type { Browser } from '@playwright/test';

const font = readFileSync('node_modules/@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2').toString('base64');
const FACE = `@font-face { font-family: Fraunces; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 900; }`;

/** Monta uma imagem de loja: legenda em cima, captura do app embaixo, no tamanho exato. */
export async function frame(browser: Browser, shot: Buffer, caption: string, width: number, height: number, out: string) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const img = `data:image/png;base64,${shot.toString('base64')}`;
  await page.setContent(`<!doctype html><html><head><style>${FACE}
    html, body { margin: 0; width: ${width}px; height: ${height}px; background: #F3EEE4; overflow: hidden; }
    .wrap { display: flex; flex-direction: column; align-items: center; height: 100%; }
    h1 { font-family: Fraunces; font-weight: 600; color: #1E1A16; text-align: center;
         font-size: ${Math.round(width * 0.075)}px; line-height: 1.15; margin: ${Math.round(height * 0.06)}px ${Math.round(width * 0.08)}px ${Math.round(height * 0.035)}px; }
    img { flex: 1; min-height: 0; border-radius: ${Math.round(width * 0.05)}px; box-shadow: 0 24px 60px rgba(60,40,20,.25);
          border: ${Math.round(width * 0.012)}px solid #1E1A16; margin-bottom: -${Math.round(height * 0.06)}px; }
  </style></head><body><div class="wrap"><h1>${caption}</h1><img src="${img}"></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  await page.close();
}

/** Imagem de destaque da Play: ficha à esquerda, frase à direita. */
export async function featureGraphic(browser: Browser, out: string) {
  const icon = readFileSync('public/icon.svg', 'utf8');
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>${FACE}
    html, body { margin: 0; width: 1024px; height: 500px; background: #F3EEE4; overflow: hidden; }
    .row { display: flex; align-items: center; gap: 56px; height: 100%; padding: 0 80px; box-sizing: border-box; }
    .row svg { width: 260px; height: 260px; flex: none; }
    h1 { font-family: Fraunces; font-weight: 600; color: #1E1A16; font-size: 64px; line-height: 1.1; margin: 0; }
    h1 span { color: #B5482A; }
  </style></head><body><div class="row">${icon}<h1>Estude menos,<br><span>lembre mais.</span></h1></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  await page.close();
}
```

- [ ] **Step 3: Roteiro das capturas**

`store/screenshots.spec.ts`:

```ts
import { test } from '@playwright/test';
import { createCards, createDeck, openApp } from '../e2e/helpers';
import { featureGraphic, frame } from './frame';

const CARDS: [string, string][] = [
  ['Qual é a capital da Austrália?', 'Canberra'],
  ['Qual é a capital do Canadá?', 'Ottawa'],
  ['Qual é a capital da Nova Zelândia?', 'Wellington'],
  ['Qual é a capital da Turquia?', 'Ancara'],
  ['Qual é a capital do Marrocos?', 'Rabat'],
];
const OUT = 'docs/loja/arte';

test('capturas das lojas', async ({ page, browser }) => {
  test.setTimeout(120_000);
  await openApp(page);
  await createDeck(page, 'Capitais do mundo');
  await createCards(page, 'Capitais do mundo', CARDS);

  const shots: [Buffer, string][] = [];
  await page.goto('/');
  shots.push([await page.screenshot(), 'Alguns minutos por dia']);

  await page.getByRole('link', { name: 'Estudar agora' }).click();
  shots.push([await page.screenshot(), 'Tente lembrar antes de virar']);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Bom/ }).waitFor();
  shots.push([await page.screenshot(), 'Cada card volta na hora certa']);

  // o primeiro card já está virado; responde todos com Bom até o fim da sessão
  await page.getByRole('button', { name: /^Bom/ }).click();
  for (let i = 1; i < CARDS.length; i++) {
    await page.getByRole('button', { name: 'Mostrar resposta' }).click();
    await page.getByRole('button', { name: /^Bom/ }).click();
  }
  await page.waitForURL(/#\/study\/end/);
  await page.waitForTimeout(800); // números terminam de contar
  shots.push([await page.screenshot(), 'Veja seu progresso']);

  await page.goto('/#/import');
  shots.push([await page.screenshot(), 'Crie cards com qualquer IA']);

  for (const [i, [shot, caption]] of shots.entries()) {
    const n = String(i + 1).padStart(2, '0');
    await frame(browser, shot, caption, 1080, 1920, `${OUT}/play-${n}.png`);
    await frame(browser, shot, caption, 1290, 2796, `${OUT}/ios-${n}.png`);
  }
  await featureGraphic(browser, `${OUT}/play-destaque.png`);
});
```

- [ ] **Step 4: Gerar e conferir**

Run: `npm run screenshots`
Expected: PASS e 11 arquivos em `docs/loja/arte/`.

Run: `node -e "const s=require('sharp');for(const f of ['play-01','ios-01','play-destaque'])s('docs/loja/arte/'+f+'.png').metadata().then(m=>console.log(f,m.width,m.height))"`
Expected: `play-01 1080 1920`, `ios-01 1290 2796`, `play-destaque 1024 500`.

Abrir as 11 imagens com a ferramenta de leitura de imagem e conferir: legenda legível em Fraunces; a captura mostra a tela certa (Hoje com o baralho, frente do card, verso com os quatro botões e os intervalos, fim da sessão, importar); nada cortado de forma estranha. Se algum seletor do roteiro não bater com a tela real, ajustar o seletor (não a tela).

- [ ] **Step 5: Commit**

```bash
git add playwright.store.config.ts store package.json docs/loja/arte
git commit -m "feat: capturas de tela e imagem de destaque para as lojas"
```

---

### Task 9: Material das lojas e passo a passo do autor

**Precondição:** o mesmo e-mail da Task 7 e o domínio de produção da Vercel. Para o domínio, rodar `npx vercel project inspect lembra` ou perguntar ao autor; nos textos abaixo, `SITE` representa esse domínio (por exemplo `https://lembra.vercel.app`): escrever o real.

**Files:**
- Create: `docs/loja/textos.md`, `docs/loja/play.md`, `docs/loja/app-store.md`, `docs/loja/passo-a-passo.md`

**Interfaces:**
- Consumes: arte da Task 8; URLs da Task 7; versão da Task 1.
- Produces: tudo o que o autor cola nos consoles.

- [ ] **Step 1: `docs/loja/textos.md`**

Copiar a seção 7 da spec **literalmente** (título, subtítulo, descrição curta, texto promocional, palavras-chave, descrição longa sem o `>` de citação), com um cabeçalho que diga para cada campo: em qual loja vai e o limite de caracteres. Acrescentar no fim:

```markdown
## Contato e links (as duas lojas)

- E-mail: CONTATO
- Política de privacidade: SITE/privacidade
- Suporte: SITE/suporte
- Site: SITE
```

Conferir os limites:

Run: `node -e "const t={sub:'Estude menos, lembre mais',curta:'Flashcards com repetição espaçada. Estude poucos minutos por dia e lembre mais.',kw:'repetição espaçada,memorizar,memória,concurso,vestibular,enem,idiomas,revisão,estudo,cartões,FSRS'};for(const[k,v]of Object.entries(t))console.log(k,[...v].length)"`
Expected: `sub 25` (≤30), `curta 79` (≤80), `kw 97` (≤100).

- [ ] **Step 2: `docs/loja/play.md`**

````markdown
# Google Play — o que preencher

## Ficha da loja principal
- Nome do app: Lembra: Flashcards
- Descrição curta e descrição completa: `textos.md`
- Ícone: `arte/play-icone.png` · Recurso gráfico: `arte/play-destaque.png`
- Capturas de tela do telefone: `arte/play-01.png` a `arte/play-05.png`, nessa ordem
- Categoria: Educação · Tags: Educação, Estudo
- E-mail: CONTATO · Site: SITE · Política de privacidade: SITE/privacidade

## Conteúdo do app
- **Política de privacidade:** SITE/privacidade
- **Anúncios:** Não, meu app não contém anúncios
- **Acesso ao app:** Todas as funcionalidades estão disponíveis sem restrições de acesso
- **Classificação do conteúdo (IARC):** categoria "Referência, notícias ou educação"; responder "Não" a todas as perguntas (violência, sexualidade, linguagem, substâncias, apostas, interação entre usuários, compartilhamento de localização, compras digitais). Resultado esperado: Livre.
- **Público-alvo:** 13 a 15, 16 a 17 e 18 ou mais. Não marcar faixas abaixo de 13. "O app pode atrair crianças sem querer?": Não.
- **Segurança dos dados:**
  - O app coleta ou compartilha algum dos tipos de dados obrigatórios? **Não.**
  - Resultado: "Nenhum dado coletado" e "Nenhum dado compartilhado".
- **App governamental:** Não · **Recursos financeiros:** Nenhum · **Saúde:** Nenhum

## Assinatura com a mesma chave do APK
Ver `passo-a-passo.md`, passo 4.

## Teste fechado
- Faixa: Teste fechado › Criar faixa "Testadores Lembra"
- Testadores: lista de e-mails com **14 ou 15 pessoas** (folga sobre os 12 exigidos)
- Países: Brasil
- Convite para mandar aos testadores:

> Oi! Estou lançando o Lembra, um app de flashcards para estudar poucos minutos por dia. Preciso de
> gente testando por 14 dias antes de publicar. É só: 1) abrir este link no celular Android e tocar
> em "Quero participar": LINK_DO_TESTE; 2) instalar pela Play Store; 3) deixar instalado por pelo
> menos 14 dias (usar de vez em quando ajuda muito). Se achar qualquer problema, me conta. Obrigado!

## Pedido de acesso à produção (depois de 14 dias com 12+ testadores)
Respostas sugeridas, para ajustar com o que de fato aconteceu:
- **Como recrutou os testadores?** Amigos, família e colegas de estudo, convidados por e-mail e mensagem.
- **Como foi o engajamento?** Os testadores usaram o estudo diário, criaram baralhos e importaram cards; o retorno veio por mensagem e e-mail.
- **Resumo do retorno:** (listar o que os testadores relataram e o que foi corrigido, com as versões)
- **Público do app:** estudantes de concurso, vestibular, faculdade e idiomas, e qualquer pessoa que queira memorizar algo.
- **Como o app se destaca?** Limite diário por minutos que evita acumular revisões, criação rápida de cards e importação de cards gerados por IA, tudo offline e sem conta.
- **Quantos downloads espera no primeiro ano?** 0 a 10 mil.
- **O que mudou com o teste?** (listar)
- **Por que o app está pronto?** Passou pelo teste fechado sem falhas graves; os problemas relatados foram corrigidos; o fluxo principal (criar, estudar, fazer backup) foi usado no dia a dia.
````

(Os dois itens entre parênteses ficam assim de propósito: o autor preenche com o que aconteceu no teste, que ainda não existe. `LINK_DO_TESTE` é o link que o Play Console mostra depois de criar a faixa.)

- [ ] **Step 3: `docs/loja/app-store.md`**

```markdown
# App Store Connect — o que preencher

## Informações do app
- Nome: Lembra: Flashcards · Subtítulo: Estude menos, lembre mais
- Categoria principal: Educação · Secundária: Produtividade
- Classificação etária: responder "Nenhum" a tudo → 4+
- Direitos de conteúdo: não contém conteúdo de terceiros

## Preço e disponibilidade
- Preço: Grátis (US$ 0) · Disponibilidade: todos os países e regiões

## Privacidade do app
- URL da política: SITE/privacidade
- Coleta de dados: **"Não, não coletamos dados deste app"** → "Dados não coletados"

## Página da versão 1.0.0
- Capturas de iPhone 6,9": `arte/ios-01.png` a `arte/ios-05.png`, nessa ordem
- Texto promocional, descrição e palavras-chave: `textos.md`
- URL de suporte: SITE/suporte · URL de marketing: SITE
- Direitos autorais: 2026 DottoLeao
- Build: a mais recente do TestFlight

## Informações para a revisão da Apple
- Login necessário: Não
- Contato: nome do autor, telefone, CONTATO
- Notas:

> O Lembra é um app de flashcards com repetição espaçada. Não tem login, conta, compras nem conteúdo
> remoto: todos os dados ficam no aparelho e o app funciona offline.
> Para testar: abra o app, passe pelo onboarding (ou toque em "Pular"), crie um baralho, adicione um
> card em "+ Criar" e toque em "Estudar agora". Toque no card para virar e escolha uma resposta
> (ou arraste o card para os lados). O backup automático aparece no app Arquivos em
> "No meu iPhone › Lembra".

## TestFlight
- Informações de teste: "Use o app no dia a dia e conte qualquer problema para CONTATO."
- Grupo externo "Testadores" → ativar link público → mandar o link para quem vai testar no iPhone.
```

- [ ] **Step 4: `docs/loja/passo-a-passo.md`**

```markdown
# Passo a passo do autor

Tudo aqui envolve senha, pagamento ou aceitar termos: é você quem faz. O resto já está pronto no repositório.

## 1. E-mail do app
1. Crie o e-mail do app (ex.: lembra.flashcards@gmail.com) e passe o endereço para atualizar os textos.
2. (Opcional) Encaminhar para o seu e-mail profissional: na conta nova, ⚙️ › Ver todas as configurações ›
   Encaminhamento e POP/IMAP › Adicionar um endereço de encaminhamento. Confirme o código que chega no profissional.

## 2. Conta Google Play (pessoa física, US$ 25 uma vez)
1. play.google.com/console › Criar conta › Pessoal.
2. Verificação de identidade (documento) e do celular. Pode levar alguns dias.

## 3. Conta Apple Developer (pessoa física, US$ 99 por ano)
1. developer.apple.com/programs › Enroll, com o seu Apple ID (com verificação em duas etapas ligada).
2. Depois de aprovada, anote o **Team ID** (Membership details).

## 4. Play: criar o app e subir o primeiro AAB
1. Play Console › Criar app › Nome "Lembra: Flashcards", idioma pt-BR, App, Gratuito; aceite as declarações.
2. Preencha "Conteúdo do app" com `play.md`.
3. Baixe o AAB: GitHub › Actions › "APK Android" › última execução › artefato `lembra-aab`.
4. Teste › Teste fechado › Criar faixa › Criar versão. Ao configurar a assinatura, escolha
   **"Usar uma chave de assinatura diferente / Exportar e enviar uma chave de um repositório Java"**:
   1. Baixe a ferramenta PEPK e a chave de criptografia que a página oferece.
   2. No seu computador, com o arquivo `.jks` do Lembra:
      `java -jar pepk.jar --keystore=lembra.jks --alias=SEU_ALIAS --output=saida.zip --include-cert --rsa-aes-encryption --encryption-key-path=encryption_public_key.pem`
      (ele pede as senhas da chave; digite você).
   3. Envie o `saida.zip` na página.
5. Envie o AAB, preencha as notas da versão ("Primeira versão de teste") e publique na faixa.
6. Adicione a lista de testadores e mande o convite de `play.md`.
7. Conte 14 dias **com 12 ou mais testadores inscritos o tempo todo**.

## 5. Apple: chave da API, segredos e registro do app
1. App Store Connect › Usuários e acesso › Integrações › Chaves da API da App Store Connect › Gerar chave,
   função **App Manager**. Baixe o `.p8` (só dá para baixar uma vez) e anote o Key ID e o Issuer ID.
2. GitHub › repositório lembra › Settings › Secrets and variables › Actions:
   - Secrets: `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`,
     `APP_STORE_CONNECT_KEY_P8` (o conteúdo do `.p8` em base64: no PowerShell,
     `[Convert]::ToBase64String([IO.File]::ReadAllBytes("AuthKey_XXXX.p8"))`)
   - Variables: `APPLE_TEAM_ID` (o Team ID do passo 3)
3. App Store Connect › Apps › + › Novo app: iOS, nome "Lembra: Flashcards", idioma Português (Brasil),
   bundle ID `com.dottoleao.lembra` (se não aparecer na lista, crie em developer.apple.com ›
   Identifiers), SKU `lembra`.
4. Avise para disparar o workflow "iOS TestFlight".
5. Quando a build aparecer no TestFlight: preencha "TestFlight" de `app-store.md` e mande o link público.

## 6. Publicar
- **Play:** no 15º dia, Painel › Solicitar acesso à produção, com as respostas de `play.md`.
  Depois, promova a versão do teste fechado para Produção.
- **Apple:** preencha a página da versão com `app-store.md` e clique em "Enviar para revisão".
```

- [ ] **Step 5: Varredura final**

Run: `grep -rn "Anki" docs/loja public/privacidade public/suporte; grep -rln "CONTATO\|SITE" docs/loja public e2e/legal.spec.ts`
Expected: nenhuma menção a "Anki"; nenhum arquivo ainda com `CONTATO` ou `SITE` (todos trocados pelos valores reais). `LINK_DO_TESTE` e os dois itens entre parênteses de `play.md` continuam de propósito.

- [ ] **Step 6: Commit**

```bash
git add docs/loja
git commit -m "docs: textos, respostas dos consoles e passo a passo para publicar nas lojas"
```

---

## Verificação final (depois de todas as tasks)

- [ ] `npm run build && npm test && npm run test:e2e`: tudo PASS.
- [ ] `git log origin/main..HEAD --format="%h %s%n%b" | grep -niE "claude|co-authored|generated with|anthropic|🤖"`: sem saída.
- [ ] Depois do push: o workflow "APK Android" publica `lembra.apk` e o artefato `lembra-aab`; o autor instala o APK e confere o ícone e a abertura (claro e escuro).
- [ ] As páginas `/privacidade` e `/suporte` abrem no domínio da Vercel.
