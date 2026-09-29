# Lembra — Etapa 1.1: app Android (APK) com backup automático

**Data:** 2026-09-30
**Status:** design aprovado em conversa; aguardando revisão desta spec
**Base:** `docs/superpowers/specs/2026-09-29-lembra-etapa1-design.md` (tudo o que está lá continua valendo)

## 1. Objetivo

O autor quer **baixar e instalar o Lembra como app no Android**, com os dados guardados de forma
durável no celular e um backup automático que sobreviva a desinstalar o app.

**Pronto quando:**

1. Um envio para `main` (ou um disparo manual) gera no GitHub um APK assinado, publicado numa
   Release, que o autor baixa e instala pelo celular.
2. Instalar uma versão nova por cima da anterior mantém os dados (mesma chave de assinatura).
3. O app abre e funciona sem internet.
4. O backup automático cria arquivos em `Documentos/Lembra` no celular, mantendo os 7 mais
   recentes.
5. A versão web (Vercel) continua funcionando como antes.

## 2. Empacotamento (Capacitor)

- Capacitor (última versão estável) com `@capacitor/core`, `@capacitor/cli`,
  `@capacitor/android` e `@capacitor/filesystem`.
- `capacitor.config.ts`: `appId: 'com.dottoleao.lembra'`, `appName: 'Lembra'`, `webDir: 'dist'`.
- A pasta `android/` gerada por `npx cap add android` entra no git (é o projeto Android).
- Plataforma detectada com `Capacitor.isNativePlatform()`, isolada num módulo `src/ui/platform.ts`
  (`isNativeApp(): boolean`). Nenhuma outra parte do código chama o Capacitor diretamente, exceto
  o módulo de backup nativo.
- No app nativo, **o service worker não é registrado** e o `UpdatePrompt` não aparece: o APK já
  traz os arquivos. Na web nada muda.

## 3. Memória no celular

- O banco continua sendo o IndexedDB (Dexie). No app, ele fica no armazenamento interno do app
  (WebView do Capacitor): não é afetado por limpar o Chrome e só é apagado ao desinstalar.
- Nenhuma mudança na camada `src/data/`.

## 4. Backup automático (só no app nativo)

**Regras (código puro, testado):** `src/domain/autoBackup.ts`

- `shouldAutoBackup(lastAutoBackupAt: number | undefined, now: number): boolean` → verdadeiro se
  nunca houve backup automático ou se o último tem mais de 24 h.
- `backupFileName(now: number, dayStartHour: number): string` →
  `lembra-backup-YYYY-MM-DD.json` (data do dia de estudo). Um arquivo por dia: o backup do mesmo
  dia sobrescreve o anterior.
- `filesToDelete(fileNames: string[], keep = 7): string[]` → entre os nomes no formato
  `lembra-backup-YYYY-MM-DD.json`, devolve os mais antigos além dos 7 mais recentes; ignora
  qualquer outro arquivo da pasta.

**Quando roda:**

1. ao terminar uma sessão de estudo (tela de estudo, antes de ir para o resumo);
2. ao abrir o app, se `shouldAutoBackup` for verdadeiro.

Só roda se `Settings.autoBackup !== false` (padrão: ligado).

**Onde grava:** `@capacitor/filesystem`, `Directory.Documents`, pasta `Lembra/`
(caminho visível no celular: `Documentos/Lembra`). O conteúdo é o mesmo `exportBackupJson()`
de hoje (backup completo com progresso). Depois de gravar: atualiza
`Settings.lastAutoBackupAt` e apaga os arquivos que `filesToDelete` indicar.

**Falhas:** o backup automático nunca interrompe o estudo. Se falhar (permissão negada, disco
cheio), registra no console e mostra um toast discreto no máximo uma vez por abertura do app:
"Não consegui salvar o backup automático." Se o Android recusar gravar em Documentos, pedir a
permissão com `Filesystem.requestPermissions()` uma vez; se continuar negado, o interruptor em
Ajustes mostra "Sem permissão para salvar em Documentos".

**Ajustes:** no grupo Backup, só no app nativo, uma linha com interruptor "Backup automático"
e o texto "Último: <data>" (ou "Ainda não feito"). `Settings` ganha `autoBackup?: boolean` e
`lastAutoBackupAt?: number`.

**Restaurar:** sem tela nova. Importar → Abrir arquivo → escolher o arquivo em
`Documentos/Lembra` (a importação de backup já existe).

## 5. APK pelo GitHub

- Workflow `.github/workflows/android.yml`, disparado por push em `main` e manualmente
  (`workflow_dispatch`):
  1. Node 24, `npm ci`, `npm run build`, `npx cap sync android`;
  2. Java 21 (Temurin) e Gradle via `android/gradlew`;
  3. `assembleRelease` assinado com a chave do repositório;
  4. publica o APK como asset da Release `apk-latest` (pré-release, sobrescrita a cada build)
     com o nome `lembra.apk`.
- **Chave de assinatura:** um keystore gerado uma vez (`keytool`), guardado como segredos do
  repositório (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
  `ANDROID_KEY_PASSWORD`). O arquivo **nunca** entra no git; uma cópia fica com o autor fora do
  repositório. `android/app/build.gradle` lê a assinatura de variáveis de ambiente.
- Versão do app (`versionCode`) = número da execução do workflow, para cada APK novo instalar
  por cima do anterior.

## 6. Migração dos dados atuais

Os dados criados no navegador (Vercel) ficam no Chrome. Para levar ao app: Ajustes → Exportar
tudo no Chrome, depois Importar no app. Nenhum código novo.

## 7. Testes

- Vitest: `autoBackup.ts` (24 h, nome do arquivo pelo dia de estudo, rotação mantendo 7 e
  ignorando arquivos alheios); `Settings` novos campos com padrão.
- A suíte atual (unidade + e2e web) continua passando; o e2e web não vê nada do nativo.
- O workflow do GitHub gerando o APK é o teste de empacotamento.
- Manual no Android: instalar, abrir sem internet, estudar, conferir `Documentos/Lembra`,
  instalar versão nova por cima e ver os dados mantidos.

## 8. Fora desta etapa

Play Store, iOS, notificações, sincronização entre aparelhos, restaurar backup automático sem
passar pela tela de importação.
