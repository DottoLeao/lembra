# Lembra — Etapa 1.2: publicação na Play Store e na App Store (design)

**Data:** 2026-10-06
**Status:** design aprovado em conversa; aguardando revisão desta spec
**Base:** `2026-09-29-lembra-etapa1-design.md` e `2026-09-30-lembra-android-design.md` (tudo o que
está lá continua valendo)

## 1. Objetivo

Publicar o Lembra na Google Play e na App Store, com marca, textos e documentos em ordem, sem
mudar o que o app faz.

**Pronto quando:**

1. O app Android mostra o ícone e a abertura do Lembra (não os padrões do Capacitor).
2. O CI gera um AAB assinado que a Play aceita, além do APK de hoje.
3. O CI gera um IPA assinado e o envia ao TestFlight, a partir de um runner macOS, sem Mac local.
4. `/privacidade` e `/suporte` estão publicadas no site da Vercel.
5. `docs/loja/` traz todos os textos, respostas de formulários e artes que as duas lojas pedem.
6. O app está em produção na Play e aprovado na App Store.

### Decisões tomadas

| Tema | Decisão |
|---|---|
| Nome | "Lembra" no aparelho; "Lembra: Flashcards" como título nas lojas |
| Modelo | Grátis, sem anúncios, sem conta, dados só no aparelho |
| Idioma | Só pt-BR; disponível em todos os países |
| Contas de desenvolvedor | Pessoa física nas duas lojas |
| Contato público | E-mail novo só do app, criado pelo autor (ver seção 8) |
| Build iOS | GitHub Actions com runner macOS (repositório público: sem custo) |
| Envio | Android: CI gera o AAB, o autor sobe no Play Console. iOS: CI envia ao TestFlight |
| Chave da Play | Assinatura pela Play com a **mesma chave** do APK atual (exportada com PEPK) |
| Aparelhos Apple | Só iPhone, sem iPad |
| Vibração | Sim, leve, só no app nativo |

### Fora do escopo

Conta, sincronização, comunidade, outros idiomas, iPad, compras no app, automação de metadados
(fastlane), notificações.

## 2. Marca e arte

### 2.1 Ícone do app

- Fontes em `assets/` (pasta nova na raiz, lida pelo `@capacitor/assets`):
  - `assets/icon-only.png` 1024×1024: o desenho de `public/icon.svg` **sem cantos arredondados**
    (fundo `#1E1A16` ocupando o quadrado inteiro), sem transparência. Base do ícone iOS.
  - `assets/icon-foreground.png` 1024×1024: só a ficha, transparente, dentro do círculo central
    de 66% (área segura do ícone adaptativo).
  - `assets/icon-background.png` 1024×1024: `#1E1A16` sólido.
- Os PNG saem dos SVG por um script (`scripts/brand-assets.mjs`, com `sharp` declarado como
  dependência de desenvolvimento, e não só herdado do `@vite-pwa/assets-generator`), para que o SVG continue sendo a única fonte do desenho.
- Script `npm run assets`: gera os PNG e roda `npx capacitor-assets generate --android --ios`
  com fundo da abertura `#F3EEE4` (claro) e `#16130F` (escuro).
- Resultado no Android: `mipmap-*` e `mipmap-anydpi-v26` trocados; ícone redondo também.

### 2.2 Abertura

- Fundo papel `#F3EEE4` com a ficha no centro; no tema escuro do sistema, `#16130F`.
- Android 12+: `Theme.SplashScreen` com `windowSplashScreenBackground` e
  `windowSplashScreenAnimatedIcon` apontando para a ficha (em `values/` e `values-night/`).
  Android < 12: os `splash.png` gerados.
- iOS: `LaunchScreen.storyboard` gerado pelo `@capacitor/assets`, com as mesmas cores.

### 2.3 Arte das lojas (em `docs/loja/arte/`, fora do app)

| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `play-icone.png` | 512×512 | Igual a `icon-only.png` (a Play arredonda) |
| `play-destaque.png` | 1024×500 | Ficha à esquerda; "Estude menos, lembre mais." em Fraunces à direita, fundo papel |
| `play-01..05.png` | 1080×1920 | Capturas da Play |
| `ios-01..05.png` | 1290×2796 | Capturas da App Store (iPhone 6,9") |

**Capturas:** um teste Playwright à parte (`e2e/store-screenshots.spec.ts`, fora da suíte normal,
rodado por `npm run screenshots`) semeia um baralho de exemplo "Capitais do mundo" e captura cinco
telas no tema claro. Cada imagem final tem uma faixa de legenda em cima, em Fraunces, montada pelo
mesmo script:

1. Hoje: "Alguns minutos por dia"
2. Card virado: "Tente lembrar antes de virar"
3. Respostas com intervalos: "Cada card volta na hora certa"
4. Fim da sessão: "Veja seu progresso"
5. Importar: "Crie cards com qualquer IA"

## 3. Android e Play Store

### 3.1 Build

- `.github/workflows/android.yml` ganha o passo `./gradlew bundleRelease` e publica
  `lembra.aab` como artefato do workflow (não na Release pública, que continua só com o APK).
- `package.json` vai para `1.0.0`. `android/app/build.gradle` lê o `versionName` do
  `package.json`; `versionCode` continua `VERSION_CODE` (número da execução do CI).

### 3.2 Manifesto

Sem mudanças nas permissões. Entra um comentário acima de `requestLegacyExternalStorage` e das
permissões de armazenamento: são necessárias para o backup em Documentos no Android 9 e 10;
do 11 em diante o sistema as ignora. `allowBackup="true"` continua (o backup do próprio Android
não é coleta pelo desenvolvedor).

### 3.3 Chave de assinatura

No primeiro envio, o autor escolhe "Usar uma chave existente" na Assinatura de apps do Google Play
e exporta a chave atual com a ferramenta PEPK (passo local, com a senha da chave, feito pelo
autor). Assim o app instalado pelo APK atualiza pela Play sem perder dados.
`docs/loja/play.md` traz o passo a passo.

### 3.4 Respostas do Play Console (em `docs/loja/play.md`)

- **Segurança dos dados:** não coleta dados; não compartilha dados. O app não faz chamadas de
  rede (fontes embutidas, sem análise, sem anúncios).
- **Classificação indicativa (IARC):** sem violência, sexo, linguagem, drogas, apostas, interação
  entre usuários ou compras → Livre.
- **Público-alvo:** 13 anos ou mais.
- **Categoria:** Educação. **Anúncios:** não. **Acesso ao app:** tudo disponível sem login.
- **Teste fechado:** lista de e-mails "Testadores Lembra", texto de convite pronto, lembrete de que
  os 12 precisam ficar inscritos por 14 dias seguidos, e as respostas do questionário de acesso à
  produção (o que foi testado, quantos testadores, o que mudou com o retorno).

## 4. iPhone e App Store

### 4.1 Projeto

- Dependência `@capacitor/ios`; `npx cap add ios`; a pasta `ios/` entra no git.
  Se o comando exigir macOS, a pasta é gerada uma vez por um workflow manual e commitada.
- Bundle ID `com.dottoleao.lembra`; `TARGETED_DEVICE_FAMILY = 1` (só iPhone); orientação só retrato;
  iOS mínimo é o padrão do Capacitor 8.
- `Info.plist`:
  - `UIFileSharingEnabled` e `LSSupportsOpeningDocumentsInPlace` = `true` (backups aparecem no
    app Arquivos);
  - `ITSAppUsesNonExemptEncryption` = `false`;
  - `CFBundleDisplayName` = `Lembra`.
- `ios/App/App/PrivacyInfo.xcprivacy`: `NSPrivacyTracking` falso, sem domínios de rastreamento,
  sem tipos de dados coletados, e as APIs de motivo obrigatório usadas pelo app (`UserDefaults`,
  CA92.1). Os plugins do Capacitor trazem os próprios manifestos.

### 4.2 Backup no iOS

`src/ui/nativeBackupFs.ts` passa a decidir a pasta pela plataforma:

- Android: `Documentos/Lembra` (como hoje).
- iOS: a raiz de `Directory.Documents`, que o app Arquivos mostra como "No meu iPhone › Lembra".

`saveToDocuments` devolve o caminho certo para cada um, e `SAVED_MESSAGE` vira uma função:
"Salvo em Documentos/Lembra" no Android, "Salvo em Arquivos › No meu iPhone › Lembra" no iOS.
`src/ui/platform.ts` ganha `nativePlatform(): 'android' | 'ios' | 'web'`. No iOS, `setSystemBars`
só aplica o estilo (a cor de fundo não existe lá; a falha já é engolida).

### 4.3 Build e envio (`.github/workflows/ios.yml`)

- `workflow_dispatch` (botão manual), `runs-on: macos-latest`.
- Passos: `npm ci` → `npm run build` → `npx cap sync ios` → `xcodebuild archive` com
  `-allowProvisioningUpdates` e a chave da API da App Store Connect (assinatura gerenciada pela
  Apple, sem certificado guardado) → `xcodebuild -exportArchive` (método `app-store-connect`) →
  `xcrun altool --upload-app` com a mesma chave.
- `CURRENT_PROJECT_VERSION` = número da execução; `MARKETING_VERSION` = versão do `package.json`.
- Segredos: `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`,
  `APP_STORE_CONNECT_KEY_P8` (conteúdo do `.p8` em base64). O workflow falha com mensagem clara se
  algum faltar, como o do Android.
- A primeira execução é de depuração: espera-se ajustar o workflow até o envio passar.

### 4.4 Respostas do App Store Connect (em `docs/loja/app-store.md`)

- **Privacidade do app:** Dados não coletados.
- **Classificação etária:** 4+. **Categoria:** Educação (secundária: Produtividade).
- **Preço:** grátis; disponível em todos os países.
- **Nota para o revisor:** o app não tem login nem conteúdo remoto; funciona offline; para testar,
  siga o onboarding, crie um baralho, adicione um card e estude; o backup fica no app Arquivos.
- **TestFlight:** grupo externo "Testadores" com link público (passa por uma revisão beta curta).

## 5. Vibração

- Dependência `@capacitor/haptics`. Módulo `src/ui/haptics.ts` com `answerHaptic(rating)` e
  `sessionEndHaptic()`; só ele chama o plugin (mesma regra do `platform.ts`).
- Sem efeito fora do app nativo; falhas são engolidas (é cosmético).
- Errei, Difícil e Bom → impacto leve; Fácil → impacto médio; fim da sessão → notificação de
  sucesso.
- Chamado dentro de `answer()` em `Study.tsx`, para valer tanto no botão quanto no gesto de
  arrastar; o fim da sessão vibra ao abrir a tela de resumo.
- Sem opção em Ajustes: o iOS já respeita a configuração de vibração do sistema.

## 6. Páginas no site

- `public/privacidade/index.html` e `public/suporte/index.html`: HTML estático com o visual do
  Lembra (cores e fontes do app, CSS embutido), claro e escuro pelo `prefers-color-scheme`.
- `vite.config.ts`: `workbox.navigateFallbackDenylist: [/^\/privacidade/, /^\/suporte/]`, para o
  service worker de quem já instalou o PWA não abrir o app nessas rotas.
- **Privacidade** (texto, com data de vigência):
  - O Lembra não coleta, não envia e não compartilha dados pessoais. Não tem conta, análise de uso
    nem anúncios.
  - Baralhos, cards e progresso ficam só no aparelho. Os backups são arquivos JSON gravados no
    aparelho (Documentos/Lembra no Android; app Arquivos no iPhone) e só saem dele se a pessoa os
    compartilhar.
  - O backup do próprio Android ou do iCloud pode incluir os dados do app, conforme os ajustes do
    aparelho; isso é feito pelo sistema, não pelo Lembra.
  - Apagar o app apaga os dados dele (os arquivos de backup ficam).
  - Mudanças nesta política serão publicadas nesta página. Contato: e-mail do app.
- **Suporte:** e-mail de contato e respostas curtas para: "Como faço backup?", "Como restauro um
  backup ou passo para outro celular?", "Por que não aparecem mais cards novos hoje?", "Como crio
  cards com uma IA?".
- Testes: `e2e/legal.spec.ts` abre as duas páginas e confere título e e-mail; um caso abre
  `/privacidade` com o service worker ativo e confere que a página carregou (não o app).

## 7. Textos das lojas (em `docs/loja/textos.md`)

**Título (as duas lojas):** Lembra: Flashcards

**Subtítulo — App Store (máx. 30):** Estude menos, lembre mais

**Descrição curta — Play (máx. 80):**
Flashcards com repetição espaçada. Estude poucos minutos por dia e lembre mais.

**Texto promocional — App Store (máx. 170):**
Poucos minutos por dia, revisão na hora certa. Crie seus cards ou peça para qualquer IA, e estude
offline, sem conta e sem anúncios.

**Palavras-chave — App Store (máx. 100, sem repetir o título):**
repetição espaçada,memorizar,memória,concurso,vestibular,enem,idiomas,revisão,estudo,cartões,FSRS

**Descrição longa (as duas lojas):**

> Estude menos, lembre mais.
>
> A gente esquece rápido. O Lembra mostra cada card pouco antes de você esquecer, e cada revisão
> na hora certa deixa a memória mais firme. Você só tenta lembrar, vira o card e diz como foi.
>
> FEITO PARA NÃO ACUMULAR
> • Você escolhe quantos minutos quer estudar por dia, e o Lembra monta a fila nesse tamanho.
> • Ficou uns dias sem estudar? Os cards com mais risco de esquecer vêm primeiro, e os novos
>   esperam até você pôr a revisão em dia.
> • A sequência de dias tem uma folga por semana, usada sozinha.
>
> CRIAR CARDS É RÁPIDO
> • "Salvar e próximo" limpa a tela e já deixa pronto para o card seguinte.
> • Peça os cards para qualquer IA: o Lembra dá o prompt, você cola a resposta, confere a prévia e
>   importa.
>
> ESTUDO QUE FUNCIONA
> • Agendamento pelo algoritmo FSRS, um dos mais precisos para repetição espaçada.
> • Recordação ativa e repetição espaçada estão entre as técnicas de estudo com mais evidência.
>
> SEU, E SÓ SEU
> • Funciona sem internet.
> • Sem conta, sem anúncios, sem coleta de dados.
> • Backup automático diário no seu aparelho, e exportação de baralhos em JSON.
> • Tema claro, escuro ou automático.
>
> Para concurso, vestibular, faculdade, idiomas ou qualquer coisa que você queira guardar.

Regra para todos os textos: não citar "Anki" nem outras marcas.

## 8. Contas e passos do autor

Feitos pelo autor (envolvem senha, pagamento ou aceitar termos), com guia passo a passo em
`docs/loja/passo-a-passo.md`:

1. Criar o e-mail do app e, opcionalmente, encaminhá-lo para o e-mail profissional. O endereço
   entra em `docs/loja/textos.md`, nas páginas legais e nos consoles. As páginas legais só são
   publicadas depois que ele existir.
2. Conta Google Play pessoa física (US$ 25) e verificação de identidade.
3. Conta Apple Developer pessoa física (US$ 99/ano).
4. Play: criar o app, exportar a chave com PEPK, subir o primeiro AAB no teste fechado, convidar os
   12 testadores.
5. Apple: criar a chave da API (função App Manager), cadastrar os 3 segredos no GitHub, criar o
   registro do app, abrir o link público do TestFlight.
6. No 15º dia de teste: pedir acesso à produção na Play. Com o TestFlight validado: enviar para
   revisão na Apple.

## 9. Ordem de execução

| # | Etapa | Quem |
|---|---|---|
| 1 | Ícone, abertura, AAB, versão 1.0.0, páginas legais, textos, capturas | Claude |
| 2 | Contas e e-mail do app | Autor |
| 3 | Chave PEPK, app na Play, primeiro AAB no teste fechado, 12 convites | Autor, com guia |
| 4 | 14 dias de teste fechado | Testadores |
| 5 | Projeto iOS, workflow do TestFlight, ajustes do iPhone, vibração (em paralelo à 4) | Claude |
| 6 | Chave da API, registro do app, link do TestFlight | Autor, com guia |
| 7 | Correções vindas dos testes | Claude |
| 8 | Produção na Play e revisão na Apple | Autor, com respostas prontas |

## 10. Testes

- **Unitários (Vitest):** `haptics.ts` com o plugin simulado (chama o estilo certo por resposta;
  não chama nada na web; engole falhas); `nativeBackupFs`/`share` com pasta e mensagem por
  plataforma.
- **E2E (Playwright):** `legal.spec.ts` (seção 6); a suíte atual continua passando.
- **Manual:** ícone e abertura no emulador Android e no APK do CI, claro e escuro; no iPhone pelo
  TestFlight: áreas seguras, barra de status, backup visível no Arquivos, importar arquivo,
  vibração.
- **CI:** o workflow Android produz `lembra.apk` e `lembra.aab`; o workflow iOS conclui o envio.

## 11. Riscos

| Risco | Resposta |
|---|---|
| Rejeição pela diretriz 4.2 da Apple (app parece site) | Visual e gestos nativos, vibração, backup no Arquivos, nota para o revisor |
| Contagem dos 14 dias reinicia se ficar abaixo de 12 testadores | Convidar 14 ou 15 pessoas |
| `cap add ios` não funcionar no Windows | Gerar a pasta por workflow manual no macOS |
| Primeira assinatura automática no CI falhar | Execução de depuração prevista; logs do `xcodebuild` |
| Nome "Lembra" já usado por um app de lembretes no F-Droid | Título "Lembra: Flashcards" e pacote próprio `com.dottoleao.lembra` |
