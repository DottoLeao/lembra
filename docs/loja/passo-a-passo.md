# Passo a passo do autor

Tudo aqui envolve senha, pagamento ou aceitar termos: é você quem faz. O resto já está pronto no repositório.

## 1. E-mail do app
1. Criado: lembra.flashcards@gmail.com.
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
   função **Admin** (a assinatura gerenciada pela Apple no CI exige essa função). Baixe o `.p8` (só dá para baixar uma vez) e anote o Key ID e o Issuer ID.
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
