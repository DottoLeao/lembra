# Publicar o Lembra nas lojas

O código já está pronto para as duas lojas. O que falta são as contas, os segredos do GitHub e os formulários das lojas, que só o dono das contas pode fazer. Depois disso, publicar uma versão é criar uma tag:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

A tag dispara `release-android.yml` (gera o `.aab` e manda para a Play) e `release-ios.yml` (compila no macOS e manda para o TestFlight).

## Marca

| Arquivo | Uso |
|---|---|
| `assets/brand/mark.svg` | ícone com cantos arredondados (PWA, site) |
| `assets/brand/icon-square.svg` | ícone quadrado (lojas e iOS aplicam a máscara) |
| `assets/brand/glyph.svg` | só os cards, sem fundo |
| `assets/brand/logo-horizontal*.svg` | logo com o nome, versão clara e escura |
| `assets/brand/png/store-icon-512.png` | ícone da Play Store |
| `assets/brand/png/play-feature-graphic.png` | arte de destaque da Play (1024x500) |

Para mudar a marca, edite os SVGs e rode `./scripts/brand.sh` (gera os PNGs, os ícones e splashes de Android e iOS e os ícones da PWA). Num ambiente sem o Chromium do Playwright baixado, aponte `CHROMIUM_PATH` para um Chromium instalado.

## Google Play

1. **Conta de desenvolvedor**: play.google.com/console, taxa única de US$ 25 e verificação de identidade.
2. **Criar o app** na Play Console: nome "Lembra", idioma pt-BR, app, gratuito.
3. **Assinatura**: na primeira versão, aceite a *Assinatura de apps do Google Play*. A chave que já está no segredo `ANDROID_KEYSTORE_BASE64` vira a **chave de upload**. Guarde o `.jks` e as senhas fora do GitHub também; sem eles não dá para atualizar o app.
4. **Primeiro envio é manual**: rode o workflow "Publicar na Play Store" (aba Actions, *Run workflow*), baixe o artefato `lembra-aab` e envie o `.aab` em *Testes > Teste interno*. A API da Play só aceita envios automáticos depois que o app já tem um pacote.
5. **Envio automático**: em *Configuração > Acesso à API*, crie uma conta de serviço no Google Cloud, dê a ela permissão de *Lançar versões* no app e baixe a chave JSON. Salve o conteúdo no segredo `PLAY_SERVICE_ACCOUNT_JSON`. A partir daí, cada tag envia um rascunho para a trilha interna.
6. **Formulários obrigatórios** (*Painel > Configurar o app*):
   - Política de privacidade: `https://lembra-nine.vercel.app/privacidade.html`
   - Segurança dos dados: **nenhum dado coletado nem compartilhado**.
   - Anúncios: não. Acesso ao app: tudo disponível sem login.
   - Classificação de conteúdo: questionário IARC (resulta em "Livre").
   - Público-alvo: 13+ evita as regras extras de apps para crianças.
7. **Ficha da loja**: textos em `textos-da-loja.md`, ícone `store-icon-512.png`, arte de destaque `play-feature-graphic.png` e pelo menos 2 capturas de tela do celular.
8. **Teste fechado obrigatório**: contas **pessoais** criadas depois de novembro de 2023 precisam de um teste fechado com **12 testadores ativos por 14 dias seguidos** antes de liberar a produção. Conta de organização (com CNPJ e D-U-N-S) não tem essa exigência.
9. Depois do teste: *Produção > Criar versão*, promova o pacote e envie para revisão.

## App Store

1. **Apple Developer Program**: developer.apple.com, US$ 99 por ano. Como pessoa física, o nome que aparece na loja é o teu nome.
2. **Identificador**: em *Certificates, IDs & Profiles > Identifiers*, registre o App ID `com.dottoleao.lembra`.
3. **Criar o app** no App Store Connect: plataforma iOS, nome "Lembra", idioma principal Português (Brasil), bundle ID `com.dottoleao.lembra`, SKU `lembra`.
4. **Chave da API**: em *Usuários e acesso > Integrações > App Store Connect API*, gere uma chave com papel **Admin** (necessário para a assinatura automática criar certificados no CI). Salve nos segredos do GitHub:
   - `ASC_KEY_ID`: ID da chave
   - `ASC_ISSUER_ID`: Issuer ID
   - `ASC_KEY_P8_BASE64`: `base64 -i AuthKey_XXXX.p8` (o arquivo só baixa uma vez)
   - `APPLE_TEAM_ID`: Team ID, em *Membership details*
5. **Primeira build**: rode o workflow "Publicar na App Store". A build aparece no TestFlight uns 15 minutos depois do fim.
6. **Privacidade do app**: "Dados não coletados". Política: `https://lembra-nine.vercel.app/privacidade.html`.
7. **Ficha**: textos em `textos-da-loja.md`, capturas de **iPhone 6,9"** (1320x2868 ou 1290x2796). O app está configurado só para iPhone, então capturas de iPad não são exigidas.
8. **Classificação etária**: questionário, resulta em 4+.
9. Selecione a build, *Adicionar para revisão*.

### Risco na revisão da Apple

A diretriz 4.2 (funcionalidade mínima) recusa apps que parecem "só um site empacotado". O Lembra tem argumentos a favor: funciona offline, guarda dados no aparelho e grava backups na pasta do app (visível no app Arquivos). Se a Apple recusar, a resposta deve destacar isso nas *Notas para revisão*. Notificações locais de lembrete de estudo também ajudam, caso seja preciso reforçar.

## Segredos do GitHub

| Segredo | Para |
|---|---|
| `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | já existem; assinam APK e AAB |
| `PLAY_SERVICE_ACCOUNT_JSON` | envio automático para a Play |
| `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8_BASE64` | assinatura e envio para a App Store |
