# Lembra — Etapa 1.1 (Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Empacotar o Lembra como APK Android (Capacitor), gerado e publicado pelo GitHub Actions, com backup automático em `Documentos/Lembra`.

**Architecture:** As regras do backup (quando fazer, nome do arquivo, quais apagar) são puras em `src/domain/autoBackup.ts`. A orquestração fica em `src/data/autoBackup.ts`, que recebe um "sistema de arquivos" por interface (`BackupFs`) e por isso é testada no Vitest com um falso. O único código que toca o Capacitor é `src/ui/platform.ts` e `src/ui/nativeBackupFs.ts`. O GitHub Actions compila e assina o APK e o publica na Release `apk-latest`.

**Tech Stack:** Capacitor 8 (`@capacitor/core`, `cli`, `android`, `filesystem@^8`), Java 21 no CI, GitHub Actions, `gh` CLI.

**Spec:** `docs/superpowers/specs/2026-09-30-lembra-android-design.md` (e a spec base `2026-09-29-lembra-etapa1-design.md`).

## Global Constraints

- Node 24; Windows + PowerShell/Git Bash localmente; CI em `ubuntu-latest`.
- `appId: 'com.dottoleao.lembra'`, `appName: 'Lembra'`, `webDir: 'dist'`.
- Pasta do backup: `Documentos/Lembra` (`Directory.Documents`, caminho `Lembra/`); arquivo `lembra-backup-YYYY-MM-DD.json` (data do dia de estudo); manter os 7 mais recentes; backup automático a cada 24 h ao abrir e sempre ao terminar uma sessão; ligado por padrão.
- Nada de Capacitor fora de `src/ui/platform.ts` e `src/ui/nativeBackupFs.ts`. A versão web (Vercel) e todos os testes atuais continuam passando.
- O keystore e as senhas **nunca** entram no git.
- Textos em pt-BR tratando por "tu". Áreas de toque ≥ 44px.
- **Commits sem nenhuma marca de IA** (sem `Co-Authored-By`, "Generated with", emoji de robô).

## Review Focus

1. **Arquivos alheios na pasta Documentos/Lembra** (outro app, cópia manual, backup de instalação anterior que o Android não deixa apagar): a rotação ignora nomes fora do padrão e erro ao apagar não interrompe. Teste: Task 3.
2. **Backup falhando** (sem permissão, disco cheio): o estudo segue normalmente e aparece no máximo um aviso. Teste: Task 3 (runner com fs que lança).
3. **Interruptor desligado**: nenhum arquivo é gravado, nem ao terminar sessão. Teste: Task 3.
4. **Dois backups no mesmo dia**: o arquivo do dia é sobrescrito, não duplicado. Teste: Tasks 1 e 3.
5. **Web não muda**: `isNativeApp()` falso no navegador; sem interruptor novo, service worker como antes. Teste: suíte e2e completa (Task 3).

---

### Task 1: Regras do backup automático (`src/domain/autoBackup.ts`)

**Files:**
- Create: `src/domain/autoBackup.ts`, `src/domain/autoBackup.test.ts`
- Modify: `src/domain/types.ts` (campos opcionais em `Settings`)

**Interfaces:**
- Consumes: `studyDayKey` (`src/domain/studyDay.ts`).
- Produces:
  - `AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000`, `AUTO_BACKUP_KEEP = 7`
  - `shouldAutoBackup(lastAutoBackupAt: number | undefined, now: number): boolean`
  - `backupFileName(now: number, dayStartHour: number): string`
  - `filesToDelete(fileNames: string[], keep?: number): string[]`
  - `Settings` ganha `autoBackup?: boolean` e `lastAutoBackupAt?: number` (sem mudar `DEFAULT_SETTINGS`).

- [ ] **Step 1: Escrever os testes** — `src/domain/autoBackup.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { backupFileName, filesToDelete, shouldAutoBackup } from './autoBackup';

const HOUR = 3_600_000;
const now = new Date(2026, 8, 30, 10).getTime();

describe('autoBackup', () => {
  it('faz backup se nunca fez ou se passou mais de 24 h', () => {
    expect(shouldAutoBackup(undefined, now)).toBe(true);
    expect(shouldAutoBackup(now - 23 * HOUR, now)).toBe(false);
    expect(shouldAutoBackup(now - 25 * HOUR, now)).toBe(true);
  });

  it('nome do arquivo usa o dia de estudo (antes das 4h é o dia anterior)', () => {
    expect(backupFileName(now, 4)).toBe('lembra-backup-2026-09-30.json');
    expect(backupFileName(new Date(2026, 8, 30, 2).getTime(), 4)).toBe('lembra-backup-2026-09-29.json');
  });

  it('mantém os 7 mais recentes e ignora arquivos fora do padrão', () => {
    const days = ['01', '02', '03', '04', '05', '06', '07', '08', '09'].map((d) => `lembra-backup-2026-09-${d}.json`);
    const shuffled = [days[4], 'outro.txt', days[0], days[8], days[2], 'lembra-backup-velho.json', days[1], days[3], days[5], days[6], days[7]];
    expect(filesToDelete(shuffled)).toEqual([days[0], days[1]]);
    expect(filesToDelete(days.slice(0, 3))).toEqual([]);
    expect(filesToDelete(days, 8)).toEqual([days[0]]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/domain/autoBackup.test.ts` → FAIL (módulo não existe).

- [ ] **Step 3: Implementar** — `src/domain/autoBackup.ts`

```ts
import { studyDayKey } from './studyDay';

export const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const AUTO_BACKUP_KEEP = 7;

const BACKUP_NAME = /^lembra-backup-\d{4}-\d{2}-\d{2}\.json$/;

export function shouldAutoBackup(lastAutoBackupAt: number | undefined, now: number): boolean {
  return lastAutoBackupAt === undefined || now - lastAutoBackupAt > AUTO_BACKUP_INTERVAL_MS;
}

export function backupFileName(now: number, dayStartHour: number): string {
  return `lembra-backup-${studyDayKey(now, dayStartHour)}.json`;
}

/** Nomes com data ISO ordenam cronologicamente como texto. */
export function filesToDelete(fileNames: string[], keep = AUTO_BACKUP_KEEP): string[] {
  const backups = fileNames.filter((n) => BACKUP_NAME.test(n)).sort();
  return backups.slice(0, Math.max(0, backups.length - keep));
}
```

Em `src/domain/types.ts`, dentro de `interface Settings`, depois de `onboardedAt?: number;`:

```ts
  /** Backup automático em Documentos/Lembra (só no app Android). Ausente = ligado. */
  autoBackup?: boolean;
  lastAutoBackupAt?: number;
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/domain` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/autoBackup.ts src/domain/autoBackup.test.ts src/domain/types.ts
git commit -m "feat: regras do backup automático"
```

---

### Task 2: Capacitor e projeto Android

**Files:**
- Create: `capacitor.config.ts`, `src/ui/platform.ts`, pasta `android/` (gerada)
- Modify: `package.json`/`package-lock.json`, `src/app/App.tsx`, `android/app/src/main/AndroidManifest.xml`, `android/app/build.gradle`, `.gitignore`

**Interfaces:**
- Produces: `isNativeApp(): boolean` (`src/ui/platform.ts`); assinatura de release lida de variáveis de ambiente `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`; `versionCode` de `VERSION_CODE` (padrão 1).

- [ ] **Step 1: Instalar**

```bash
npm install @capacitor/core@^8 @capacitor/android@^8 @capacitor/filesystem@^8
npm install -D @capacitor/cli@^8
```

- [ ] **Step 2: `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dottoleao.lembra',
  appName: 'Lembra',
  webDir: 'dist',
};

export default config;
```

Acrescente `"capacitor.config.ts"` ao `include` do `tsconfig.json`.

- [ ] **Step 3: Gerar o projeto Android**

```bash
npm run build
npx cap add android
npx cap sync android
```

Expected: pasta `android/` criada, sem erro (não precisa do Android SDK para gerar e sincronizar).

- [ ] **Step 4: Permissões de armazenamento** — em `android/app/src/main/AndroidManifest.xml`, junto das outras `<uses-permission>` (ou logo antes de `<application`):

```xml
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
```

- [ ] **Step 5: Assinatura e versão** — em `android/app/build.gradle` (Groovy gerado pelo Capacitor), dentro de `android { ... }`:
  - em `defaultConfig`, troque o `versionCode` fixo por `versionCode ((System.getenv("VERSION_CODE") ?: "1") as Integer)`;
  - acrescente antes de `buildTypes`:

```groovy
    signingConfigs {
        release {
            def ksPath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (ksPath) {
                storeFile file(ksPath)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
```

  - em `buildTypes { release { ... } }` acrescente `signingConfig signingConfigs.release`.

  Se o arquivo gerado for Kotlin (`build.gradle.kts`), escreva o equivalente em Kotlin DSL e registre no relatório.

- [ ] **Step 6: `src/ui/platform.ts` e service worker só na web**

```ts
import { Capacitor } from '@capacitor/core';

/** Verdadeiro dentro do app Android instalado; falso no navegador. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}
```

Em `src/app/App.tsx`: importe `isNativeApp` e troque `<UpdatePrompt />` por `{!isNativeApp() && <UpdatePrompt />}` (no app nativo o service worker não é registrado).

- [ ] **Step 7: `.gitignore`** — acrescente:

```
*.jks
*.keystore
android/app/release/
```

- [ ] **Step 8: Verificar** — `npm run build`, `npm test`, `npx playwright test` → tudo PASS (a web não muda).

- [ ] **Step 9: Commit**

```bash
git add capacitor.config.ts tsconfig.json src/ui/platform.ts src/app/App.tsx package.json package-lock.json android .gitignore
git commit -m "feat: projeto Android com Capacitor"
```

---

### Task 3: Backup automático no app

**Files:**
- Create: `src/data/autoBackup.ts`, `src/data/autoBackup.test.ts`, `src/ui/nativeBackupFs.ts`, `src/ui/components/AutoBackup.tsx`
- Modify: `src/app/App.tsx`, `src/ui/screens/Study.tsx` (função `finish`), `src/ui/screens/Settings.tsx`

**Interfaces:**
- Consumes: `shouldAutoBackup`, `backupFileName`, `filesToDelete` (Task 1); `isNativeApp` (Task 2); `getSettings`, `updateSettings` (`src/data/settings.ts`); `exportBackupJson` (`src/data/importExport.ts`); `useToast` (`src/ui/components/Toast.tsx`).
- Produces:
  - `interface BackupFs { list(): Promise<string[]>; write(name: string, data: string): Promise<void>; remove(name: string): Promise<void> }`
  - `runAutoBackup(fs: BackupFs, now: number, opts?: { force?: boolean }): Promise<'saved' | 'skipped' | 'disabled'>` — lança se a gravação falhar (quem chama decide o aviso).
  - `nativeBackupFs: BackupFs` (Capacitor Filesystem, `Directory.Documents`, pasta `Lembra`).
  - `<AutoBackup />`: roda uma vez ao abrir o app, só no nativo.
  - `runNativeAutoBackup(now: number, force: boolean): Promise<boolean>` em `src/ui/components/AutoBackup.tsx` — nunca lança; devolve `false` se falhou.

- [ ] **Step 1: Testes do runner** — `src/data/autoBackup.test.ts`

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { parseCardJson } from '../domain/cardJson';
import { resetDb } from '../test/resetDb';
import { runAutoBackup, type BackupFs } from './autoBackup';
import { createCard } from './cards';
import { createDeck } from './decks';
import { getSettings, updateSettings } from './settings';

const HOUR = 3_600_000;
const now = new Date(2026, 8, 30, 10).getTime();

function fakeFs(initial: string[] = []) {
  const files = new Map<string, string>(initial.map((n) => [n, '{}']));
  const removed: string[] = [];
  const fs: BackupFs = {
    list: async () => [...files.keys()],
    write: async (name, data) => void files.set(name, data),
    remove: async (name) => {
      removed.push(name);
      files.delete(name);
    },
  };
  return { fs, files, removed };
}

beforeEach(resetDb);

describe('runAutoBackup', () => {
  it('grava o backup completo do dia e registra a data', async () => {
    const d = await createDeck('Inglês');
    await createCard(d.id, 'Put off', 'Adiar');
    const { fs, files } = fakeFs();
    expect(await runAutoBackup(fs, now)).toBe('saved');
    const content = files.get('lembra-backup-2026-09-30.json')!;
    const parsed = parseCardJson(content);
    expect(parsed.ok && parsed.decks[0].cards[0].front).toBe('Put off');
    expect((await getSettings()).lastAutoBackupAt).toBe(now);
  });

  it('dentro de 24 h não repete, a não ser forçado; no mesmo dia sobrescreve', async () => {
    const { fs, files } = fakeFs();
    await runAutoBackup(fs, now);
    expect(await runAutoBackup(fs, now + HOUR)).toBe('skipped');
    expect(await runAutoBackup(fs, now + HOUR, { force: true })).toBe('saved');
    expect(files.size).toBe(1);
  });

  it('desligado não grava nada, nem forçado', async () => {
    await updateSettings({ autoBackup: false });
    const { fs, files } = fakeFs();
    expect(await runAutoBackup(fs, now, { force: true })).toBe('disabled');
    expect(files.size).toBe(0);
  });

  it('apaga os mais antigos além de 7 e não toca em arquivos alheios', async () => {
    const old = ['01', '02', '03', '04', '05', '06', '07', '08'].map((d) => `lembra-backup-2026-09-${d}.json`);
    const { fs, removed, files } = fakeFs([...old, 'foto.jpg']);
    await runAutoBackup(fs, now);
    expect(removed.sort()).toEqual(['lembra-backup-2026-09-01.json', 'lembra-backup-2026-09-02.json']);
    expect(files.has('foto.jpg')).toBe(true);
  });

  it('erro ao apagar arquivo antigo não interrompe', async () => {
    const old = ['01', '02', '03', '04', '05', '06', '07', '08'].map((d) => `lembra-backup-2026-09-${d}.json`);
    const { fs } = fakeFs(old);
    fs.remove = async () => {
      throw new Error('arquivo de outra instalação');
    };
    expect(await runAutoBackup(fs, now)).toBe('saved');
  });

  it('erro ao gravar é repassado e não marca a data', async () => {
    const { fs } = fakeFs();
    fs.write = async () => {
      throw new Error('sem permissão');
    };
    await expect(runAutoBackup(fs, now)).rejects.toThrow('sem permissão');
    expect((await getSettings()).lastAutoBackupAt).toBeUndefined();
  });
});
```

Run: `npx vitest run src/data/autoBackup.test.ts` → FAIL.

- [ ] **Step 2: Implementar `src/data/autoBackup.ts`**

```ts
import { backupFileName, filesToDelete, shouldAutoBackup } from '../domain/autoBackup';
import { exportBackupJson } from './importExport';
import { getSettings, updateSettings } from './settings';

/** Onde o backup automático é guardado; no app é a pasta Documentos/Lembra. */
export interface BackupFs {
  list(): Promise<string[]>;
  write(name: string, data: string): Promise<void>;
  remove(name: string): Promise<void>;
}

export async function runAutoBackup(
  fs: BackupFs,
  now: number,
  opts: { force?: boolean } = {},
): Promise<'saved' | 'skipped' | 'disabled'> {
  const settings = await getSettings();
  if (settings.autoBackup === false) return 'disabled';
  if (!opts.force && !shouldAutoBackup(settings.lastAutoBackupAt, now)) return 'skipped';

  await fs.write(backupFileName(now, settings.dayStartHour), await exportBackupJson());
  await updateSettings({ lastAutoBackupAt: now });

  for (const name of filesToDelete(await fs.list())) {
    try {
      await fs.remove(name);
    } catch {
      // arquivo que o Android não deixa apagar (ex.: de outra instalação): segue
    }
  }
  return 'saved';
}
```

Run: `npx vitest run src/data/autoBackup.test.ts` → PASS.

- [ ] **Step 3: `src/ui/nativeBackupFs.ts`**

```ts
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import type { BackupFs } from '../data/autoBackup';

const FOLDER = 'Lembra';

async function ensurePermission(): Promise<void> {
  const status = await Filesystem.checkPermissions();
  if (status.publicStorage !== 'granted') await Filesystem.requestPermissions();
}

export const nativeBackupFs: BackupFs = {
  async list() {
    try {
      const result = await Filesystem.readdir({ path: FOLDER, directory: Directory.Documents });
      return result.files.map((f) => f.name);
    } catch {
      return []; // pasta ainda não existe
    }
  },
  async write(name, data) {
    await ensurePermission();
    await Filesystem.writeFile({
      path: `${FOLDER}/${name}`,
      data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  },
  async remove(name) {
    await Filesystem.deleteFile({ path: `${FOLDER}/${name}`, directory: Directory.Documents });
  },
};
```

- [ ] **Step 4: `src/ui/components/AutoBackup.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { runAutoBackup } from '../../data/autoBackup';
import { nativeBackupFs } from '../nativeBackupFs';
import { isNativeApp } from '../platform';
import { useToast } from './Toast';

let warned = false;

/** Roda o backup automático no app Android; nunca lança. Avisa no máximo uma vez por abertura. */
export async function runNativeAutoBackup(now: number, force: boolean, warn?: (msg: string) => void): Promise<boolean> {
  if (!isNativeApp()) return true;
  try {
    await runAutoBackup(nativeBackupFs, now, { force });
    return true;
  } catch (error) {
    console.error('backup automático falhou', error);
    if (!warned && warn) {
      warned = true;
      warn('Não consegui salvar o backup automático.');
    }
    return false;
  }
}

export function AutoBackup() {
  const toast = useToast();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runNativeAutoBackup(Date.now(), false, (message) => toast({ message }));
  }, [toast]);
  return null;
}
```

Em `src/app/App.tsx`, dentro do `<ToastProvider>`, ao lado do `<RouterProvider>`: `<AutoBackup />`.

- [ ] **Step 5: Backup ao terminar a sessão** — em `src/ui/screens/Study.tsx`, na função `finish`, logo depois do bloco que chama `markDayCompleted` e antes de navegar, acrescente (use o `toast` da tela; se a tela não tiver, pegue com `useToast()`):

```ts
    if (s.answered > 0) await runNativeAutoBackup(Date.now(), true, (message) => toast({ message }));
```

- [ ] **Step 6: Interruptor em Ajustes** — em `src/ui/screens/Settings.tsx`, dentro da seção "Backup", antes do botão "Exportar tudo", só quando `isNativeApp()`:

```tsx
        {isNativeApp() && (
          <div className="settings-row">
            <div>
              <label htmlFor="auto-backup" className="settings-row__label">Backup automático</label>
              <p className="settings-row__hint">
                Em Documentos/Lembra ·{' '}
                {settings.lastAutoBackupAt
                  ? `último: ${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(settings.lastAutoBackupAt)}`
                  : 'ainda não feito'}
              </p>
            </div>
            <input id="auto-backup" type="checkbox" role="switch" checked={settings.autoBackup !== false}
              onChange={(e) => set({ autoBackup: e.target.checked })} style={{ width: 44, height: 44, accentColor: 'var(--ink)' }} />
          </div>
        )}
```

- [ ] **Step 7: Verificar** — `npm run build`, `npm test`, `npx playwright test` → tudo PASS; `npx cap sync android` sem erro.

- [ ] **Step 8: Commit**

```bash
git add src android
git commit -m "feat: backup automático em Documentos/Lembra no app Android"
```

---

### Task 4: GitHub Actions que gera e publica o APK

**Files:**
- Create: `.github/workflows/android.yml`

**Interfaces:**
- Consumes: segredos do repositório `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (criados pelo controlador, Task 5); assinatura por variáveis de ambiente (Task 2).
- Produces: Release `apk-latest` (pré-release) com o asset `lembra.apk`.

- [ ] **Step 1: Criar `.github/workflows/android.yml`**

```yaml
name: APK Android

on:
  push:
    branches: [main, etapa-1]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  apk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - run: npm ci
      - run: npm run build
      - run: npx cap sync android

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21

      - name: Recuperar chave de assinatura
        run: echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$RUNNER_TEMP/lembra.jks"
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}

      - name: Compilar APK assinado
        working-directory: android
        run: chmod +x gradlew && ./gradlew assembleRelease --no-daemon
        env:
          ANDROID_KEYSTORE_PATH: ${{ runner.temp }}/lembra.jks
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
          VERSION_CODE: ${{ github.run_number }}

      - name: Publicar na Release apk-latest
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          cp android/app/build/outputs/apk/release/app-release.apk lembra.apk
          gh release view apk-latest >/dev/null 2>&1 || \
            gh release create apk-latest --prerelease --title "Lembra — APK mais recente" \
              --notes "APK do Lembra gerado automaticamente. Baixe lembra.apk no celular e instale."
          gh release upload apk-latest lembra.apk --clobber
```

- [ ] **Step 2: Commit e push**

```bash
git add .github/workflows/android.yml
git commit -m "ci: gera e publica o APK Android no GitHub"
git push
```

Se `npm ci` falhar no CI por dependência opcional de plataforma ausente no `package-lock.json`, troque `npm ci` por `npm install` e registre.

---

### Task 5 (controlador): chave de assinatura, primeiro build e verificação

Feita pelo controlador, não por subagente (lida com segredos).

- [ ] **Step 1: Gerar o keystore fora do repositório** — em `C:/Users/dotto/lembra-keystore/`: `keytool -genkeypair -v -keystore lembra.jks -alias lembra -keyalg RSA -keysize 2048 -validity 10000 -storepass <senha> -keypass <senha> -dname "CN=Lembra, O=DottoLeao, C=BR"` com senha aleatória; salvar a senha em `senha.txt` na mesma pasta.
- [ ] **Step 2: Segredos** — `gh secret set` para os 4 segredos (keystore em base64, senhas, alias `lembra`).
- [ ] **Step 3: Disparar o build na branch** — um push em `etapa-1` dispara o workflow (o disparo manual só funciona depois que o arquivo estiver na `main`); acompanhar com `gh run watch`. Se os segredos forem criados depois do push da Task 4, rodar de novo com `gh run rerun <id>`.
- [ ] **Step 4: Verificar** — `gh release view apk-latest` lista `lembra.apk`; baixar e conferir tamanho > 1 MB.
- [ ] **Step 5: Roteiro no celular** (autor): baixar `lembra.apk` da Release, instalar (permitir fontes desconhecidas), abrir sem internet, estudar, terminar uma sessão, conferir `Documentos/Lembra`; depois instalar um APK novo por cima e ver os dados mantidos.
