# Lembra — Etapa 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA de flashcards com repetição espaçada (FSRS), mobile-first, com criação manual de cards, estudo com card que gira, importação/exportação JSON e dados só no aparelho.

**Architecture:** `src/domain/` é TypeScript puro (agendamento, fila, sessão, sequência, JSON) e testado com Vitest. `src/data/` é a única camada que conhece o Dexie (IndexedDB); testada com fake-indexeddb. `src/ui/` são as telas React da maquete aprovada, testadas com Playwright em viewport de celular. `vite-plugin-pwa` torna o app instalável e offline.

**Tech Stack:** React 19, Vite 7, TypeScript 5, react-router 7 (hash router), Dexie 4 + dexie-react-hooks, ts-fsrs 5, motion 12 (`motion/react`), vite-plugin-pwa, @fontsource, Vitest 3, fake-indexeddb, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-lembra-etapa1-design.md` (leia antes de começar). Maquete: https://claude.ai/artifact/EGWrTFcvQ1FGpCYnjcgJGL

## Global Constraints

- Node 24 (`node -v` → v24.x). Windows + PowerShell; comandos `npm`/`npx` funcionam iguais.
- Todo texto da interface em português do Brasil, tratando o usuário por "tu" ("Toque para virar", "Crie teu primeiro baralho").
- Nome do app: **Lembra** (provisório).
- Cores (tokens, valores exatos): fundo `#F3EEE4`, papel 2 `#F7F2E8`, card `#FFFDF8`, tinta `#1E1A16`, tinta 2 `#4A433C`, texto secundário `#6B6259`, linha `#E4DCCD`, linha 2 `#D5CBB9`, acento `#B5482A`, menu inativo `#CFC6B6`. Respostas: Errei `#F6DDD5`/`#8A2E17`, Difícil `#F3E6C8`/`#6E4E0A`, Bom `#D9E5F1`/`#1F4A73`, Fácil `#D6EADF`/`#1F5A45`.
- Fontes locais (funcionam offline): Fraunces (títulos e texto dos cards) e Instrument Sans (interface).
- Ícones são SVG inline de traço; nunca emoji. Áreas de toque ≥ 44px. Layout mobile-first (390px), largura máxima 560px.
- Dados só no aparelho. Todo registro tem `id` UUID v4, `createdAt`, `updatedAt` (ms). Apagar é lógico (`deletedAt`).
- Constantes do domínio: retenção desejada 0,9; o dia começa às 4h; 8 s por card; 10 cards novos por dia; 10 minutos por dia; 1 card novo a cada 4 revisões; verso > 300 caracteres é "suspeito"; dia conta para a sequência com fila zerada ou ≥ 10 respostas; 1 folga por semana (segunda a domingo); toast de desfazer dura 6 s.
- **Commits sem nenhuma marca de IA**: nada de `Co-Authored-By`, "Generated with", emoji de robô ou similar. Mensagens no estilo `feat: ...`, `test: ...`, `chore: ...`.

## Review Focus

1. **Texto de card com HTML/script** (vindo de JSON de IA, ex.: `<img src=x onerror=...>`) deve aparecer como texto literal, nunca executar. Teste: Task 19 (e2e).
2. **Card com texto muito longo** (milhares de caracteres): o texto rola dentro do card e os botões continuam visíveis. Teste: Task 17 (e2e).
3. **Abrir o estudo sem nada para revisar** (app novo ou fila já zerada): mostra um estado vazio amigável, sem erro. Teste: Task 17 (e2e).
4. **Frente ou verso só com espaços**: não dá para salvar (botão desabilitado; camada de dados recusa). Testes: Task 9 (unidade) e Task 15 (e2e).
5. **Toque duplo rápido num botão de resposta**: só uma resposta é registrada. Testes: Task 5 (unidade) e Task 17 (e2e).

---

## Mapa de arquivos

```
package.json, tsconfig.json, vite.config.ts, playwright.config.ts, index.html, .gitignore
public/icon.svg (+ ícones gerados na Task 21)
src/main.tsx
src/app/App.tsx                      rotas + providers
src/domain/types.ts                  Deck, Card, ReviewLog, Settings, Rating, DEFAULT_SETTINGS
src/domain/id.ts                     newId() UUID v4
src/domain/studyDay.ts               início/fim/chave do dia de estudo, addDays, weekKey
src/domain/scheduler.ts              FsrsState, createScheduler, newFsrsState, formatInterval
src/domain/queue.ts                  buildDailyQueue (limites, prioridade, intercalação)
src/domain/session.ts                estado da sessão de estudo (puro)
src/domain/streak.ts                 sequência de dias com folga semanal
src/domain/cardJson.ts               parse tolerante, serialização, avisos, prompt da IA
src/data/db.ts                       schema Dexie
src/data/decks.ts, cards.ts, settings.ts, reviews.ts, overview.ts, importExport.ts
src/test/setup.ts, src/test/fixtures.ts, src/test/resetDb.ts
src/ui/theme/tokens.css, src/ui/styles.css
src/ui/share.ts, src/ui/storage.ts
src/ui/components/Icon.tsx, TabBar.tsx, Toast.tsx, BottomSheet.tsx, DeckSheet.tsx, DeckRow.tsx,
                  FlipCard.tsx, AnswerButtons.tsx, ErrorScreen.tsx, UpdatePrompt.tsx
src/ui/screens/Today.tsx, Decks.tsx, Deck.tsx, CardEditor.tsx, Study.tsx, SessionEnd.tsx,
               Import.tsx, Settings.tsx
e2e/helpers.ts, e2e/*.spec.ts
```

---
