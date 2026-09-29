# Lembra — Etapa 1: núcleo de estudo (design)

**Data:** 2026-09-29
**Status:** aprovado em conversa; aguardando revisão desta spec
**Nome:** "Lembra" é provisório.
**Maquete aprovada:** https://claude.ai/artifact/EGWrTFcvQ1FGpCYnjcgJGL

## 1. Objetivo

Um app de flashcards com repetição espaçada, alternativa ao Anki com experiência de uso muito
melhor. A visão de longo prazo é um produto que concorra com o Anki. A Etapa 1 é o núcleo que o
próprio autor usa todo dia no celular (Android) para estudar qualquer assunto.

**A Etapa 1 está pronta quando** o autor consegue, só pelo celular:

1. criar baralhos e cards à mão, um por um, rapidamente;
2. estudar a fila do dia com o card que gira ao toque e quatro respostas;
3. importar cards gerados por qualquer IA colando JSON (ou abrindo um arquivo `.json`);
4. exportar um baralho em JSON pelo menu de compartilhar do celular;
5. tudo isso offline, instalado na tela inicial.

### Roteiro (fora desta spec)

- **Etapa 2:** conta, sincronização entre aparelhos, servidor MCP para qualquer IA criar cards
  (usando o formato JSON da seção 6).
- **Etapa 3:** comunidade (publicar, buscar, pré-visualizar e assinar baralhos que atualizam).
- **Depois:** empacotar com Capacitor para Play Store e App Store; imagens e áudio nos cards;
  notificações; foco em nichos (ex.: concursos).

### Problemas do Anki que esta etapa ataca

A pesquisa de reclamações de usuários apontou estes problemas, e cada um tem uma resposta aqui:

| Problema do Anki | Resposta na Etapa 1 |
|---|---|
| Acúmulo de revisões após dias parado, que leva ao abandono | Limite diário derivado de "minutos por dia", prioridade por risco de esquecimento, pausa automática de cards novos (seção 5) |
| Interface datada e configuração confusa | Design de app nativo; uma configuração visível ("minutos por dia"); resto em "Avançado" |
| Criar cards dá trabalho | "Salvar e próximo" e importação de JSON gerado por qualquer IA, com pré-visualização |
| Sequência de dias que pune | 1 folga por semana, usada automaticamente |
| App pago no iPhone | PWA grátis no Android e no iPhone |

## 2. Plataforma e tecnologia

- **PWA** (app web instalável, offline), mobile-first, testada no Android (Chrome) e no iPhone
  (Safari, "Adicionar à Tela de Início").
- **React + Vite + TypeScript**.
- **Dexie** (IndexedDB) para os dados, que ficam só no aparelho.
- **ts-fsrs** para o agendamento (algoritmo FSRS).
- **Motion** (`motion/react`) para o card que gira, os gestos de arrastar e as transições.
- **vite-plugin-pwa** para manifest e service worker.
- Hospedagem estática (ex.: Vercel).
- Escolhido pensando no Capacitor depois: o mesmo código vira app das duas lojas. Por isso a
  interface precisa ter cara de app nativo (gestos, animações, nada de aparência de site), o que
  também reduz o risco de rejeição na App Store.

## 3. Telas

A maquete aprovada é a referência visual. O visual é o de "ficha de papel":

- **Cores:** fundo `#F3EEE4`, cards `#FFFDF8` pautados com linha vermelha no topo, tinta
  `#1E1A16`, acento terracota `#B5482A`.
- **Tipografia:** Fraunces (serifada) nos títulos e no texto dos cards, Instrument Sans na
  interface.
- **Menu inferior:** barra flutuante escura com a aba ativa em pílula clara e o botão "+ Criar"
  em terracota no centro.

| Tela | Conteúdo | Menu inferior |
|---|---|---|
| **Hoje** | Data, sequência de dias, total de cards do dia (revisões, novos, minutos estimados), "Estudar agora", lista de baralhos com quantos vencem hoje | Sim (Hoje ativo) |
| **Baralhos / Baralho** | Nome, contagens, Estudar/Importar/Exportar, busca, lista de cards com o estado de cada um (novo, hoje, em N d) | Sim (Baralhos ativo) |
| **Estudo** | Fechar (encerra e vai ao resumo), barra de progresso, desfazer, card que gira ao toque, "Mostrar resposta", depois Errei/Difícil/Bom/Fácil com o próximo intervalo; arrastar à direita = Bom, à esquerda = Errei | Não (tela de foco) |
| **Fim da sessão** | Cards, % de acerto, minutos, semana com folga, previsão de amanhã, "Voltar ao início", "Estudar mais 10 novos" | Não |
| **Criar card** | Seletor de baralho, Frente, Verso, "Salvar e próximo" (limpa e mantém o foco na Frente), "Concluir", contador da sessão | Não |
| **Importar** | "Copiar prompt para IA", Colar JSON ou Abrir arquivo, pré-visualização com marcar/desmarcar cada card e aviso de cards suspeitos, baralho de destino, "Importar N cards" | Não |
| **Ajustes** | Minutos por dia, cards novos por dia, Exportar tudo (backup), Importar backup; "Avançado": retenção desejada, hora de início do dia | Sim (Ajustes ativo) |

A tela **Ajustes** não está na maquete. Segue o mesmo visual e mostra só o que está na tabela,
mais o link "Como o Lembra funciona", que reabre o onboarding.

### 3.1 Onboarding (primeira abertura)

Quatro telas curtas que deslizam para o lado, com "Pular" sempre visível e pontos indicando a
posição. O texto fala com a voz do próprio Lembra e **não menciona o Anki**.

1. **"Estude menos, lembre mais."** Uma curva do esquecimento desenhada em SVG. Texto: "A gente
   esquece rápido. Cada revisão na hora certa deixa o esquecimento mais lento. O Lembra revisa
   cada coisa pouco antes de você esquecer."
2. **"Tente lembrar antes de virar."** Um card de prática que gira ao toque (o mesmo `FlipCard`
   do estudo). Frente: "Qual é a capital da Austrália?"; verso: "Canberra". Texto: "Puxar a
   resposta da memória fixa muito mais do que reler."
3. **"Diga como foi."** Os quatro botões de resposta, só ilustrativos. Texto: "Acertou? O card
   volta daqui a dias, depois semanas. Errou? Volta logo." Nota pequena: "Repetição espaçada e
   recordação ativa estão entre as técnicas de estudo com mais evidência (Dunlosky et al., 2013)."
4. **"Pouco, todo dia."** Duas dicas: "Uma ideia por card." e "Alguns minutos por dia valem mais
   que horas de vez em quando." A pessoa escolhe os minutos por dia (5, 10 ou 15; 10
   pré-selecionado) e toca em "Criar meu primeiro baralho". Isso salva a escolha, marca o
   onboarding como visto e abre a tela Hoje com a folha de novo baralho aberta.

- Aparece quando `Settings.onboardedAt` não existe. "Pular" também marca `onboardedAt`.
- Rota própria (`/welcome`). A tela Hoje redireciona para ela na primeira abertura.
- Reaberto por Ajustes, onde termina voltando para Ajustes, sem abrir a folha de baralho.

Criar e editar baralho acontece numa folha inferior (bottom sheet) com nome e cor. Editar um card
reaproveita a tela Criar, já preenchida.

## 4. Dados (IndexedDB via Dexie)

Todo registro tem `id` (UUID v4), `createdAt` e `updatedAt` (ms epoch), para a sincronização da
Etapa 2. Apagar é lógico (`deletedAt`), o que permite desfazer e, depois, sincronizar exclusões.

```ts
Deck      { id, name, color, createdAt, updatedAt, deletedAt? }
Card      { id, deckId, front, back, createdAt, updatedAt, deletedAt?,
            // estado FSRS (espelha o Card do ts-fsrs)
            due, stability, difficulty, elapsedDays, scheduledDays,
            reps, lapses, state /* New|Learning|Review|Relearning */, lastReview? }
ReviewLog { id, cardId, rating /* 1..4 */, reviewedAt, prevCard /* snapshot para desfazer */ }
Settings  { id: 'settings', minutesPerDay: 10, newPerDay: 10,
            desiredRetention: 0.9, dayStartHour: 4, lastExportAt?, onboardedAt? }
```

- **Índices:** `cards` por `deckId` e por `due`; `reviewLogs` por `reviewedAt` e por `cardId`.
- **Camada de dados:** só a pasta `data/` conhece o Dexie. O resto do app usa funções como
  `createCard`, `answerCard`, `undoLastAnswer`, `getTodayQueue`, `importDeck` e `exportDeck`.

## 5. Agendamento e fila do dia

- **FSRS** (`ts-fsrs`) com `request_retention = desiredRetention` (0,9) e parâmetros padrão.
  Os intervalos mostrados nos botões vêm de `fsrs.repeat(card, now)`.
- **Dia de estudo:** começa às `dayStartHour` (4h, horário local). "Hoje" = de 4h a 4h do dia
  seguinte.
- **Errei:** o card entra nos passos de reaprendizagem do FSRS e volta **na mesma sessão** quando
  vence (cerca de 10 min). Durante a sessão, cards de aprendizagem vencidos têm prioridade.
- **Limite diário de revisões:** `reviewCap = floor(minutesPerDay * 60 / 8)`, ou seja, 8 s por
  card; com 10 min dá 75.
- **Montagem da fila:**
  1. Revisões vencidas (`due <= fim do dia de estudo`), ordenadas pela **menor recuperabilidade**
     (a do FSRS, ou seja, primeiro as mais perto de serem esquecidas), cortadas em `reviewCap`.
  2. Cards novos, em ordem de criação, até `newPerDay` menos os novos já estudados hoje.
     **Se houver mais revisões vencidas do que `reviewCap`, nenhum card novo entra** (pausa
     automática).
  3. Intercalação: um card novo a cada 4 revisões; os novos que sobrarem vão no fim da fila.
- **Acúmulo:** o que passa do limite simplesmente fica para os dias seguintes, sempre pela
  prioridade de risco. Não aparece nenhum aviso punitivo. A tela Hoje mostra só o que cabe no dia.
- **"Estudar mais 10 novos"** (tela Fim): adiciona 10 novos à fila só neste dia.
- **Desfazer:** restaura `prevCard` do último `ReviewLog` da sessão e apaga esse log. Pode desfazer
  várias vezes seguidas dentro da sessão.

### Sequência de dias

- Um dia de estudo **conta** quando a fila do dia foi zerada ou quando pelo menos 10 cards foram
  respondidos nele.
- **1 folga por semana** (de segunda a domingo): se um dia não contou, a folga daquela semana o
  cobre automaticamente. Dois dias descobertos na mesma semana zeram a sequência.
- A sequência é calculada a partir dos `ReviewLog`s, sem contador guardado, para não
  dessincronizar.

## 6. Formato JSON

```json
{ "version": 1,
  "deck": "Revolução Francesa",
  "cards": [ { "front": "Em que ano começou?", "back": "1789" } ] }
```

**Importação tolerante** (na ordem):

1. Remover cercas ```` ```json ```` / ```` ``` ```` e texto antes do primeiro `{`/`[` e depois do
   último `}`/`]`.
2. Aceitar objeto `{deck, cards}` ou lista solta de cards (neste caso o baralho é escolhido na
   tela).
3. Aceitar chaves `front/back`, `frente/verso` e `question/answer`.
4. Validar: frente e verso são textos não vazios depois de `trim`. Erros apontam o índice
   ("o card 7 está sem verso"). Com qualquer erro de estrutura, nada é importado.
5. **Cards suspeitos** (vêm desmarcados na pré-visualização, com aviso): verso com mais de 300
   caracteres ("resposta longa demais para um card") e duplicatas exatas de cards já existentes no
   baralho de destino.
6. Cards importados entram como **novos**, salvos numa única transação.

**Exportação:**

- Por padrão: `version`, `deck` e `cards` com `front/back`.
- Com "incluir progresso": cada card leva também o estado FSRS e o `id`. Importar esse arquivo
  restaura o progresso: se o `id` já existe, o registro com `updatedAt` mais recente vence.
- "Exportar tudo" em Ajustes gera `{ "version": 1, "decks": [ ... ] }` com progresso.
- A saída usa `navigator.share` com arquivo quando o navegador suporta; se não, faz o download.
  Há também "Copiar JSON".

**Prompt para IA** (copiado pelo botão): pede ao usuário que diga o tema, pede cards curtos (um
fato por card), resposta com menos de 200 caracteres e saída **somente** no JSON acima.

## 7. Organização do código

```
src/
  domain/     TypeScript puro, sem React/Dexie — scheduler.ts, queue.ts, streak.ts,
              cardJson.ts, studyDay.ts
  data/       db.ts (schema Dexie), repositórios (decks, cards, reviews, settings)
  ui/
    screens/  Today, Decks, Deck, Study, SessionEnd, CardEditor, Import, Settings
    components/ FlipCard, AnswerButtons, TabBar, BottomSheet, Toast, ...
    theme/    tokens (cores, tipografia)
  app/        rotas, providers, registro do service worker
```

- O `domain/` recebe dados e devolve dados, sem acessar o banco, o que o torna testável isolado.
- Rotas no cliente (ex.: `react-router`); telas de foco sem menu inferior.

## 8. Erros e segurança dos dados

- **Importação inválida:** nada é salvo; a mensagem é específica e em português.
- **Apagar card/baralho:** apagamento lógico com toast "Desfazer" por 6 s; não há diálogo de
  confirmação.
- **Persistência:** chamar `navigator.storage.persist()` na primeira criação de card.
- **Lembrete de backup:** se `lastExportAt` tiver mais de 7 dias e houver pelo menos 20 cards,
  a tela Hoje mostra um aviso discreto e dispensável.
- **Falha do IndexedDB** (cota, modo privado): uma tela de erro amigável com a opção de exportar o
  que for possível; não pode aparecer tela branca.
- **Service worker:** quando há versão nova, mostrar "Atualização disponível — tocar para
  recarregar" (sem recarregar sozinho no meio de uma sessão).

## 9. Testes

- **Vitest (unidade, `domain/`):**
  - intervalos do FSRS para as 4 respostas;
  - fila com atraso maior que o limite (ordem por risco, pausa de novos);
  - limite de novos;
  - virada do dia às 4h;
  - sequência com folga e com dois dias perdidos;
  - `cardJson`: cercas, lista solta, chaves em português, card sem verso, suspeitos, ida e volta
    com progresso.
- **Vitest + fake-indexeddb (`data/`):** responder e desfazer, apagar e restaurar, importar
  numa transação (falha não deixa nada pela metade).
- **Playwright (viewport de celular):** criar baralho, criar 2 cards com "Salvar e próximo",
  estudar (virar, responder), exportar, importar JSON colado, conferir a pré-visualização.
- **Manual:** instalar no Android, usar offline, girar o card, arrastar para responder.

## 10. Fora da Etapa 1

Conta e sincronização, MCP, comunidade, imagens/áudio/cloze, notificações, estatísticas
detalhadas, Capacitor e lojas, importação de `.apkg`, tema escuro.
