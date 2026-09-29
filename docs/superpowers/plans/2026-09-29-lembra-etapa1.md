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
- Onboarding: textos exatos da spec (seção 3.1), sem mencionar o Anki; aparece só enquanto `Settings.onboardedAt` não existe.
- Ordem das tasks importa: cada task usa nomes e tipos das anteriores (blocos **Interfaces**). Não renomeie nada sem atualizar os consumidores.
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
### Task 1: Base do projeto (Vite + React + TS + Vitest)

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.tsx`, `src/test/setup.ts`, `src/test/setup.test.ts`

**Interfaces:**
- Produces: scripts `npm test` (Vitest, `src/**/*.test.ts`, ambiente node com `fake-indexeddb/auto`), `npm run build`, `npm run dev`.

> Não use `npm create vite` (a pasta já tem `docs/` e `.git`; o gerador pode sobrescrever). Crie os arquivos à mão.

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "lembra",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 2: Instalar dependências**

```bash
npm install react@^19 react-dom@^19 react-router@^7 dexie@^4 dexie-react-hooks ts-fsrs@^5 motion@^12 @fontsource-variable/fraunces @fontsource/instrument-sans
npm install -D vite@^7 @vitejs/plugin-react typescript@~5.9 vitest@^3 fake-indexeddb@^6 @types/react@^19 @types/react-dom@^19 @types/node
```

Se o npm acusar conflito de peer dependency entre versões maiores, use a versão mais recente compatível e registre a troca na mensagem do commit.

- [ ] **Step 3: Criar `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "e2e", "vite.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 4: Criar `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Criar `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#F3EEE4" />
    <meta name="description" content="Flashcards com repetição espaçada" />
    <title>Lembra</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Criar `.gitignore`**

```
node_modules
dist
dev-dist
test-results
playwright-report
*.local
```

- [ ] **Step 7: Criar `src/main.tsx` provisório** (substituído na Task 13)

```tsx
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(<p>Lembra</p>);
```

- [ ] **Step 8: Escrever o teste do ambiente de testes**

`src/test/setup.ts`:

```ts
import 'fake-indexeddb/auto';
```

`src/test/setup.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('ambiente de testes', () => {
  it('tem IndexedDB simulado e crypto disponíveis', () => {
    expect(typeof indexedDB.open).toBe('function');
    expect(typeof crypto.getRandomValues).toBe('function');
  });
});
```

- [ ] **Step 9: Rodar testes e build**

Run: `npm test` → Expected: 1 teste PASS.
Run: `npm run build` → Expected: build sem erros, pasta `dist/` criada.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html .gitignore src
git commit -m "chore: base do projeto com Vite, React, TypeScript e Vitest"
```

---

### Task 2: Dia de estudo (`studyDay.ts`)

**Files:**
- Create: `src/domain/studyDay.ts`
- Test: `src/domain/studyDay.test.ts`

**Interfaces:**
- Produces:
  - `studyDayStart(now: number, startHour: number): number` — ms do início do dia de estudo (hora local).
  - `studyDayEnd(now: number, startHour: number): number` — início do dia seguinte.
  - `studyDayKey(now: number, startHour: number): string` — `'YYYY-MM-DD'` do dia de estudo.
  - `parseDayKey(key: string): Date`, `addDays(key: string, n: number): string`, `weekKey(key: string): string` (segunda-feira da semana).

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from 'vitest';
import { addDays, studyDayEnd, studyDayKey, studyDayStart, weekKey } from './studyDay';

const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m).getTime(); // setembro de 2026, hora local

describe('studyDay', () => {
  it('antes das 4h ainda é o dia anterior', () => {
    expect(studyDayStart(at(29, 3, 59), 4)).toBe(at(28, 4));
  });
  it('às 4h começa um novo dia', () => {
    expect(studyDayStart(at(29, 4), 4)).toBe(at(29, 4));
  });
  it('o fim é o início do dia seguinte', () => {
    expect(studyDayEnd(at(29, 10), 4)).toBe(at(30, 4));
  });
  it('a chave usa a data do dia de estudo', () => {
    expect(studyDayKey(at(30, 2), 4)).toBe('2026-09-29');
    expect(studyDayKey(at(30, 5), 4)).toBe('2026-09-30');
  });
  it('addDays atravessa meses', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('weekKey devolve a segunda-feira', () => {
    expect(weekKey('2026-10-04')).toBe('2026-09-28'); // domingo
    expect(weekKey('2026-09-28')).toBe('2026-09-28'); // segunda
    expect(weekKey('2026-09-29')).toBe('2026-09-28'); // terça
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/studyDay.test.ts` → Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar**

```ts
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function studyDayStart(now: number, startHour: number): number {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), startHour);
  if (now < start.getTime()) start.setDate(start.getDate() - 1);
  return start.getTime();
}

export function studyDayEnd(now: number, startHour: number): number {
  const end = new Date(studyDayStart(now, startHour));
  end.setDate(end.getDate() + 1);
  return end.getTime();
}

export function studyDayKey(now: number, startHour: number): string {
  return formatDayKey(new Date(studyDayStart(now, startHour)));
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return formatDayKey(d);
}

export function weekKey(key: string): string {
  const d = parseDayKey(key);
  const daysSinceMonday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - daysSinceMonday);
  return formatDayKey(d);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/studyDay.test.ts` → Expected: PASS (6 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/studyDay.ts src/domain/studyDay.test.ts
git commit -m "feat: dia de estudo começando às 4h"
```

---

### Task 3: Tipos e agendador FSRS (`types.ts`, `scheduler.ts`)

**Files:**
- Create: `src/domain/types.ts`, `src/domain/scheduler.ts`
- Test: `src/domain/scheduler.test.ts`

**Interfaces:**
- Produces (`types.ts`): `Rating = 1|2|3|4` (Errei, Difícil, Bom, Fácil), `Deck`, `Card`, `ReviewLog`, `Settings`, `DEFAULT_SETTINGS` (código abaixo).
- Produces (`scheduler.ts`):
  - `type FsrsState` — o `Card` do ts-fsrs com `due`/`last_review` em ms (number).
  - `State` (reexport do ts-fsrs: `New=0, Learning=1, Review=2, Relearning=3`).
  - `newFsrsState(now: number): FsrsState`, `isNew(s): boolean`, `isLearning(s): boolean`.
  - `createScheduler(desiredRetention: number, enableFuzz = true): Scheduler` com `preview(s, now): Record<Rating, number>` (ms do próximo vencimento), `answer(s, rating, now): FsrsState`, `retrievability(s, now): number` (0 para card novo).
  - `formatInterval(ms: number): string` — `'10 min'`, `'3 h'`, `'3 d'`, `'2 m'`, `'1,1 a'`.

- [ ] **Step 1: Criar `src/domain/types.ts`**

```ts
import type { FsrsState } from './scheduler';

export type Rating = 1 | 2 | 3 | 4;

export interface Deck {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
  fsrs: FsrsState;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: Rating;
  reviewedAt: number;
  /** Estado FSRS antes da resposta; usado para desfazer. */
  prevFsrs: FsrsState;
}

export interface Settings {
  id: 'settings';
  minutesPerDay: number;
  newPerDay: number;
  desiredRetention: number;
  dayStartHour: number;
  lastExportAt?: number;
  onboardedAt?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  minutesPerDay: 10,
  newPerDay: 10,
  desiredRetention: 0.9,
  dayStartHour: 4,
};
```

- [ ] **Step 2: Escrever os testes do agendador**

`src/domain/scheduler.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createScheduler, formatInterval, isLearning, isNew, newFsrsState, State } from './scheduler';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const now = new Date(2026, 8, 29, 10).getTime();
const sched = createScheduler(0.9, false);

describe('scheduler', () => {
  it('card novo começa como New e vence agora', () => {
    const s = newFsrsState(now);
    expect(isNew(s)).toBe(true);
    expect(s.due).toBe(now);
  });

  it('prévia de card novo: Errei < Bom < Fácil, e Fácil leva pelo menos 1 dia', () => {
    const p = sched.preview(newFsrsState(now), now);
    expect(p[1]).toBeLessThan(p[3]);
    expect(p[3]).toBeLessThan(p[4]);
    expect(p[4] - now).toBeGreaterThanOrEqual(DAY);
  });

  it('responder Bom num card novo conta uma repetição e sai de New', () => {
    const s = sched.answer(newFsrsState(now), 3, now);
    expect(s.reps).toBe(1);
    expect(isNew(s)).toBe(false);
    expect(s.last_review).toBe(now);
  });

  it('Errei num card em revisão conta um lapso e volta em menos de 1 hora', () => {
    const review = sched.answer(newFsrsState(now), 4, now);
    expect(review.state).toBe(State.Review);
    const t = review.due;
    const lapsed = sched.answer(review, 1, t);
    expect(lapsed.lapses).toBe(1);
    expect(isLearning(lapsed)).toBe(true);
    expect(lapsed.due - t).toBeLessThanOrEqual(HOUR);
  });

  it('a chance de lembrar cai com o tempo; card novo tem 0', () => {
    const review = sched.answer(newFsrsState(now), 4, now);
    const r1 = sched.retrievability(review, review.due);
    const r2 = sched.retrievability(review, review.due + 30 * DAY);
    expect(r1).toBeGreaterThan(r2);
    expect(sched.retrievability(newFsrsState(now), now)).toBe(0);
  });

  it('formata intervalos em português', () => {
    expect(formatInterval(30_000)).toBe('1 min');
    expect(formatInterval(10 * MIN)).toBe('10 min');
    expect(formatInterval(3 * HOUR)).toBe('3 h');
    expect(formatInterval(DAY)).toBe('1 d');
    expect(formatInterval(3 * DAY)).toBe('3 d');
    expect(formatInterval(45 * DAY)).toBe('2 m');
    expect(formatInterval(400 * DAY)).toBe('1,1 a');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/domain/scheduler.test.ts` → Expected: FAIL (módulo não existe).

- [ ] **Step 4: Implementar `src/domain/scheduler.ts`**

```ts
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  State,
  type Card as FsrsCard,
  type Grade,
} from 'ts-fsrs';
import type { Rating } from './types';

export { State };

/** Estado FSRS guardado no banco: igual ao Card do ts-fsrs, com datas em ms. */
export type FsrsState = Omit<FsrsCard, 'due' | 'last_review'> & { due: number; last_review?: number };

export interface Scheduler {
  preview(s: FsrsState, now: number): Record<Rating, number>;
  answer(s: FsrsState, rating: Rating, now: number): FsrsState;
  retrievability(s: FsrsState, now: number): number;
}

function toFsrs(s: FsrsState): FsrsCard {
  const { due, last_review, ...rest } = s;
  return {
    ...rest,
    due: new Date(due),
    ...(last_review !== undefined ? { last_review: new Date(last_review) } : {}),
  } as FsrsCard;
}

function fromFsrs(c: FsrsCard): FsrsState {
  const { due, last_review, ...rest } = c;
  const state: FsrsState = { ...rest, due: new Date(due).getTime() };
  if (last_review) state.last_review = new Date(last_review).getTime();
  return state;
}

export function newFsrsState(now: number): FsrsState {
  return fromFsrs(createEmptyCard(new Date(now)));
}

export function isNew(s: FsrsState): boolean {
  return s.state === State.New;
}

export function isLearning(s: FsrsState): boolean {
  return s.state === State.Learning || s.state === State.Relearning;
}

const RATINGS: Rating[] = [1, 2, 3, 4];

export function createScheduler(desiredRetention: number, enableFuzz = true): Scheduler {
  const f = fsrs(generatorParameters({ request_retention: desiredRetention, enable_fuzz: enableFuzz }));
  return {
    preview(s, now) {
      const p = f.repeat(toFsrs(s), new Date(now));
      const out = {} as Record<Rating, number>;
      for (const r of RATINGS) out[r] = p[r as Grade].card.due.getTime();
      return out;
    },
    answer(s, rating, now) {
      return fromFsrs(f.next(toFsrs(s), new Date(now), rating as Grade).card);
    },
    retrievability(s, now) {
      if (isNew(s)) return 0;
      return f.get_retrievability(toFsrs(s), new Date(now), false);
    },
  };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatInterval(ms: number): string {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / MIN))} min`;
  if (ms < DAY) return `${Math.round(ms / HOUR)} h`;
  const days = ms / DAY;
  if (days < 30) return `${Math.round(days)} d`;
  if (days < 365) return `${Math.round(days / 30)} m`;
  return `${(days / 365).toFixed(1).replace('.', ',')} a`;
}
```

Se a API do ts-fsrs instalado divergir (nomes `repeat`, `next`, `get_retrievability`, `generatorParameters`), confira `node_modules/ts-fsrs/README.md` e ajuste só os nomes; o comportamento testado deve continuar o mesmo.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/domain/scheduler.test.ts` → Expected: PASS (6 testes).

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/scheduler.ts src/domain/scheduler.test.ts
git commit -m "feat: tipos do domínio e agendador FSRS"
```

---

### Task 4: Fila do dia (`queue.ts`)

**Files:**
- Create: `src/domain/queue.ts`, `src/test/fixtures.ts`
- Test: `src/domain/queue.test.ts`

**Interfaces:**
- Consumes: `Card`, `Settings`, `DEFAULT_SETTINGS` (Task 3); `FsrsState`, `isNew`, `newFsrsState`, `State` (Task 3); `studyDayEnd` (Task 2).
- Produces:
  - `SECONDS_PER_CARD = 8`, `NEW_EVERY = 4`, `reviewCap(minutesPerDay: number): number`.
  - `interface QueueInput { cards: Card[]; now: number; settings: Settings; newStudiedToday: number; reviewsDoneToday: number; extraNew?: number; retrievability: (s: FsrsState, now: number) => number }`
  - `interface DailyQueue { cards: Card[]; reviewCount: number; newCount: number; backlog: number; estimatedMinutes: number }`
  - `buildDailyQueue(input: QueueInput): DailyQueue`
  - `interleave<T>(reviews: T[], news: T[], every: number): T[]`
  - `src/test/fixtures.ts`: `makeCard(id: string, fsrs?: Partial<FsrsState>, extra?: Partial<Card>): Card`

Regras (spec, seção 5): revisões vencidas antes do fim do dia de estudo, ordenadas pela menor chance de lembrar; limite `reviewCap(minutesPerDay) - reviewsDoneToday`; se sobrar revisão fora do limite (`backlog > 0`) nenhum card novo entra, exceto `extraNew` (pedido explícito do usuário); novos em ordem de criação até `newPerDay - newStudiedToday`; um novo a cada 4 revisões.

- [ ] **Step 1: Criar `src/test/fixtures.ts`**

```ts
import { newFsrsState, type FsrsState } from '../domain/scheduler';
import type { Card } from '../domain/types';

export function makeCard(id: string, fsrs: Partial<FsrsState> = {}, extra: Partial<Card> = {}): Card {
  return {
    id,
    deckId: 'd1',
    front: `Frente ${id}`,
    back: `Verso ${id}`,
    createdAt: 0,
    updatedAt: 0,
    fsrs: { ...newFsrsState(0), ...fsrs },
    ...extra,
  };
}
```

- [ ] **Step 2: Escrever os testes**

`src/domain/queue.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import { buildDailyQueue, interleave, reviewCap, type QueueInput } from './queue';
import { State, type FsrsState } from './scheduler';
import { studyDayEnd } from './studyDay';
import { DEFAULT_SETTINGS, type Card } from './types';

const now = new Date(2026, 8, 29, 10).getTime();
const end = studyDayEnd(now, 4);
const HOUR = 3_600_000;

// Nos testes, a "chance de lembrar" é a própria stability, para controlar a ordem.
const fakeR = (s: FsrsState) => s.stability;

const review = (id: string, r: number, due = now - HOUR) =>
  makeCard(id, { state: State.Review, due, stability: r });
const fresh = (id: string, createdAt: number) => makeCard(id, {}, { createdAt });

function run(cards: Card[], over: Partial<QueueInput> = {}) {
  return buildDailyQueue({
    cards,
    now,
    settings: { ...DEFAULT_SETTINGS, minutesPerDay: 1, newPerDay: 3 }, // limite = 7 revisões
    newStudiedToday: 0,
    reviewsDoneToday: 0,
    retrievability: fakeR,
    ...over,
  });
}

describe('buildDailyQueue', () => {
  it('limite de revisões vem dos minutos por dia (8 s por card)', () => {
    expect(reviewCap(10)).toBe(75);
    expect(reviewCap(1)).toBe(7);
  });

  it('inclui só revisões que vencem antes do fim do dia de estudo', () => {
    const q = run([review('a', 0.5), review('b', 0.5, end - 1), review('c', 0.5, end + 1)]);
    expect(q.cards.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('ordena pela menor chance de lembrar primeiro', () => {
    const q = run([review('a', 0.9), review('b', 0.2), review('c', 0.5)]);
    expect(q.cards.map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('corta no limite, conta o atraso e pausa os novos', () => {
    const reviews = Array.from({ length: 10 }, (_, i) => review(`r${i}`, i / 10));
    const q = run([...reviews, fresh('n1', 1)]);
    expect(q.reviewCount).toBe(7);
    expect(q.backlog).toBe(3);
    expect(q.newCount).toBe(0);
  });

  it('desconta revisões já feitas hoje do limite', () => {
    const reviews = Array.from({ length: 10 }, (_, i) => review(`r${i}`, i / 10));
    const q = run(reviews, { reviewsDoneToday: 5 });
    expect(q.reviewCount).toBe(2);
  });

  it('limita novos a newPerDay menos os já estudados, mais antigos primeiro', () => {
    const q = run([fresh('n3', 3), fresh('n1', 1), fresh('n2', 2), fresh('n4', 4)], { newStudiedToday: 1 });
    expect(q.cards.map((c) => c.id)).toEqual(['n1', 'n2']);
  });

  it('extraNew acrescenta novos mesmo com atraso', () => {
    const reviews = Array.from({ length: 10 }, (_, i) => review(`r${i}`, i / 10));
    const q = run([...reviews, fresh('n1', 1), fresh('n2', 2)], { extraNew: 1 });
    expect(q.newCount).toBe(1);
  });

  it('intercala um novo a cada 4 revisões', () => {
    const reviews = Array.from({ length: 5 }, (_, i) => review(`r${i}`, i / 10));
    const q = run([...reviews, fresh('n1', 1), fresh('n2', 2)]);
    expect(q.cards.map((c) => c.id)).toEqual(['r0', 'r1', 'r2', 'r3', 'n1', 'r4', 'n2']);
  });

  it('ignora cards apagados', () => {
    const q = run([review('a', 0.5), { ...review('b', 0.5), deletedAt: 1 }]);
    expect(q.cards.map((c) => c.id)).toEqual(['a']);
  });

  it('estima minutos a 8 s por card', () => {
    const q = run(Array.from({ length: 7 }, (_, i) => review(`r${i}`, 0.5)));
    expect(q.estimatedMinutes).toBe(1);
    expect(interleave([1, 2], [9], 4)).toEqual([1, 2, 9]);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/domain/queue.test.ts` → Expected: FAIL (módulo não existe).

- [ ] **Step 4: Implementar `src/domain/queue.ts`**

```ts
import { isNew, type FsrsState } from './scheduler';
import { studyDayEnd } from './studyDay';
import type { Card, Settings } from './types';

export const SECONDS_PER_CARD = 8;
export const NEW_EVERY = 4;

export interface QueueInput {
  cards: Card[];
  now: number;
  settings: Settings;
  newStudiedToday: number;
  reviewsDoneToday: number;
  extraNew?: number;
  retrievability: (s: FsrsState, now: number) => number;
}

export interface DailyQueue {
  cards: Card[];
  reviewCount: number;
  newCount: number;
  /** Revisões vencidas que ficaram de fora por causa do limite diário. */
  backlog: number;
  estimatedMinutes: number;
}

export function reviewCap(minutesPerDay: number): number {
  return Math.floor((minutesPerDay * 60) / SECONDS_PER_CARD);
}

export function interleave<T>(reviews: T[], news: T[], every: number): T[] {
  const out: T[] = [];
  let n = 0;
  reviews.forEach((r, i) => {
    out.push(r);
    if ((i + 1) % every === 0 && n < news.length) out.push(news[n++]);
  });
  while (n < news.length) out.push(news[n++]);
  return out;
}

export function buildDailyQueue(input: QueueInput): DailyQueue {
  const { cards, now, settings, newStudiedToday, reviewsDoneToday, extraNew = 0, retrievability } = input;
  const end = studyDayEnd(now, settings.dayStartHour);
  const active = cards.filter((c) => c.deletedAt === undefined);

  const dueReviews = active
    .filter((c) => !isNew(c.fsrs) && c.fsrs.due < end)
    .map((c) => ({ c, r: retrievability(c.fsrs, now) }))
    .sort((a, b) => a.r - b.r || a.c.fsrs.due - b.c.fsrs.due)
    .map((x) => x.c);

  const cap = Math.max(0, reviewCap(settings.minutesPerDay) - reviewsDoneToday);
  const reviews = dueReviews.slice(0, cap);
  const backlog = dueReviews.length - reviews.length;

  const regularNew = backlog > 0 ? 0 : Math.max(0, settings.newPerDay - newStudiedToday);
  const news = active
    .filter((c) => isNew(c.fsrs))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, regularNew + extraNew);

  const mixed = interleave(reviews, news, NEW_EVERY);
  return {
    cards: mixed,
    reviewCount: reviews.length,
    newCount: news.length,
    backlog,
    estimatedMinutes: Math.ceil((mixed.length * SECONDS_PER_CARD) / 60),
  };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/domain/queue.test.ts` → Expected: PASS (10 testes).

- [ ] **Step 6: Commit**

```bash
git add src/domain/queue.ts src/domain/queue.test.ts src/test/fixtures.ts
git commit -m "feat: fila do dia com limite, prioridade por risco e pausa de novos"
```

---

### Task 5: Sessão de estudo (`session.ts`)

**Files:**
- Create: `src/domain/session.ts`
- Test: `src/domain/session.test.ts`

**Interfaces:**
- Consumes: `Card`, `Rating` (Task 3), `isLearning` (Task 3), `makeCard` (Task 4).
- Produces:
  - `interface SessionState { pending: Card[]; learning: Card[]; answered: number; again: number; startedAt: number }`
  - `startSession(cards: Card[], now: number): SessionState`
  - `currentCard(s: SessionState, now: number): Card | undefined` — card de aprendizagem já vencido primeiro; senão o próximo da fila; senão o card de aprendizagem que vence antes (mesmo que ainda não tenha vencido).
  - `remaining(s: SessionState): number`
  - `applyAnswer(s: SessionState, updated: Card, rating: Rating, endOfDay: number): SessionState` — ignora (devolve `s` intacto) se o card não está na sessão; isso protege contra toque duplo.
  - `applyUndo(s: SessionState, restored: Card, rating: Rating): SessionState` — devolve o card para o início da fila.

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import { State } from './scheduler';
import { applyAnswer, applyUndo, currentCard, remaining, startSession } from './session';

const now = 1_000_000;
const MIN = 60_000;
const END = now + 10 * 60 * MIN;
const a = makeCard('a');
const b = makeCard('b');
const learning = (card: typeof a, due: number) => ({ ...card, fsrs: { ...card.fsrs, state: State.Relearning, due } });
const graduated = (card: typeof a) => ({ ...card, fsrs: { ...card.fsrs, state: State.Review, due: now + 3 * 24 * 60 * MIN } });

describe('session', () => {
  it('começa pelo primeiro card da fila', () => {
    const s = startSession([a, b], now);
    expect(currentCard(s, now)?.id).toBe('a');
    expect(remaining(s)).toBe(2);
  });

  it('card respondido e graduado sai da sessão', () => {
    const s = applyAnswer(startSession([a, b], now), graduated(a), 3, END);
    expect(currentCard(s, now)?.id).toBe('b');
    expect(s.answered).toBe(1);
    expect(s.again).toBe(0);
  });

  it('Errei manda o card para aprendizagem e ele volta quando vence', () => {
    let s = startSession([a, b], now);
    s = applyAnswer(s, learning(a, now + 10 * MIN), 1, END);
    expect(s.again).toBe(1);
    expect(currentCard(s, now)?.id).toBe('b');
    expect(currentCard(s, now + 11 * MIN)?.id).toBe('a');
  });

  it('sem fila, mostra o card de aprendizagem mesmo antes de vencer', () => {
    let s = startSession([a], now);
    s = applyAnswer(s, learning(a, now + 10 * MIN), 1, END);
    expect(currentCard(s, now)?.id).toBe('a');
    expect(remaining(s)).toBe(1);
  });

  it('aprendizagem que só vence depois do fim do dia sai da sessão', () => {
    const s = applyAnswer(startSession([a], now), learning(a, END + MIN), 1, END);
    expect(remaining(s)).toBe(0);
  });

  it('responder duas vezes o mesmo card conta só uma (toque duplo)', () => {
    const once = applyAnswer(startSession([a, b], now), graduated(a), 4, END);
    const twice = applyAnswer(once, graduated(a), 4, END);
    expect(twice).toBe(once);
    expect(twice.answered).toBe(1);
  });

  it('desfazer devolve o card ao início e desconta os contadores', () => {
    let s = startSession([a, b], now);
    s = applyAnswer(s, learning(a, now + 10 * MIN), 1, END);
    s = applyUndo(s, a, 1);
    expect(currentCard(s, now)?.id).toBe('a');
    expect(s.learning).toHaveLength(0);
    expect(s.answered).toBe(0);
    expect(s.again).toBe(0);
    expect(remaining(s)).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/session.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar `src/domain/session.ts`**

```ts
import { isLearning } from './scheduler';
import type { Card, Rating } from './types';

export interface SessionState {
  pending: Card[];
  learning: Card[];
  answered: number;
  again: number;
  startedAt: number;
}

export function startSession(cards: Card[], now: number): SessionState {
  return { pending: [...cards], learning: [], answered: 0, again: 0, startedAt: now };
}

const byDue = (x: Card, y: Card) => x.fsrs.due - y.fsrs.due;

export function currentCard(s: SessionState, now: number): Card | undefined {
  const dueLearning = s.learning.filter((c) => c.fsrs.due <= now).sort(byDue)[0];
  if (dueLearning) return dueLearning;
  if (s.pending.length > 0) return s.pending[0];
  return [...s.learning].sort(byDue)[0];
}

export function remaining(s: SessionState): number {
  return s.pending.length + s.learning.length;
}

export function applyAnswer(s: SessionState, updated: Card, rating: Rating, endOfDay: number): SessionState {
  const inSession = s.pending.some((c) => c.id === updated.id) || s.learning.some((c) => c.id === updated.id);
  if (!inSession) return s;
  const pending = s.pending.filter((c) => c.id !== updated.id);
  const learning = s.learning.filter((c) => c.id !== updated.id);
  if (isLearning(updated.fsrs) && updated.fsrs.due < endOfDay) learning.push(updated);
  return { ...s, pending, learning, answered: s.answered + 1, again: s.again + (rating === 1 ? 1 : 0) };
}

export function applyUndo(s: SessionState, restored: Card, rating: Rating): SessionState {
  return {
    ...s,
    pending: [restored, ...s.pending.filter((c) => c.id !== restored.id)],
    learning: s.learning.filter((c) => c.id !== restored.id),
    answered: Math.max(0, s.answered - 1),
    again: Math.max(0, s.again - (rating === 1 ? 1 : 0)),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/session.test.ts` → Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/session.ts src/domain/session.test.ts
git commit -m "feat: estado da sessão de estudo com aprendizagem e desfazer"
```

---

### Task 6: Sequência de dias com folga (`streak.ts`)

**Files:**
- Create: `src/domain/streak.ts`
- Test: `src/domain/streak.test.ts`

**Interfaces:**
- Consumes: `addDays`, `weekKey` (Task 2).
- Produces:
  - `MIN_CARDS_FOR_DAY = 10`
  - `interface StreakInfo { days: number; freezeAvailable: boolean; countedToday: boolean }`
  - `type DayStatus = 'done' | 'missed' | 'today'`; `interface WeekDay { key: string; status: DayStatus }`
  - `countedDays(reviewsPerDay: Map<string, number>, completedDays: Iterable<string>): Set<string>`
  - `computeStreak(counted: Set<string>, today: string): StreakInfo`
  - `lastSevenDays(counted: Set<string>, today: string): WeekDay[]` (do mais antigo para hoje)

Regra: andando para trás a partir de hoje (ou de ontem, se hoje ainda não contou), cada dia contado soma 1; o primeiro dia não contado de cada semana (segunda a domingo) usa a folga e não quebra a sequência; um segundo dia não contado na mesma semana quebra. Folgas não somam dias.

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from 'vitest';
import { computeStreak, countedDays, lastSevenDays } from './streak';

const days = (...keys: string[]) => new Set(keys);

describe('streak', () => {
  it('sem dias contados, sequência zero com folga disponível', () => {
    expect(computeStreak(days(), '2026-10-01')).toEqual({ days: 0, freezeAvailable: true, countedToday: false });
  });

  it('dias seguidos até hoje', () => {
    const s = computeStreak(days('2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'), '2026-10-01');
    expect(s).toEqual({ days: 5, freezeAvailable: true, countedToday: true });
  });

  it('hoje ainda não contou: a sequência de ontem continua', () => {
    const s = computeStreak(days('2026-09-29', '2026-09-30'), '2026-10-01');
    expect(s.days).toBe(2);
    expect(s.countedToday).toBe(false);
  });

  it('um dia perdido na semana usa a folga', () => {
    // 28/09 (segunda) perdido; semana anterior completa de quinta a domingo
    const counted = days('2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-29', '2026-09-30', '2026-10-01');
    expect(computeStreak(counted, '2026-10-01')).toEqual({ days: 7, freezeAvailable: false, countedToday: true });
  });

  it('dois dias perdidos na mesma semana quebram a sequência', () => {
    // 22/09 e 23/09 perdidos, ambos na semana de 21/09
    const counted = days('2026-09-21', '2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01');
    expect(computeStreak(counted, '2026-10-01')).toEqual({ days: 8, freezeAvailable: true, countedToday: true });
  });

  it('dia conta com 10 respostas ou com a fila zerada', () => {
    const perDay = new Map([['2026-09-29', 10], ['2026-09-30', 3]]);
    expect(countedDays(perDay, ['2026-10-01'])).toEqual(days('2026-09-29', '2026-10-01'));
  });

  it('últimos 7 dias com status', () => {
    const week = lastSevenDays(days('2026-09-29', '2026-10-01'), '2026-10-01');
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ key: '2026-09-25', status: 'missed' });
    expect(week[4]).toEqual({ key: '2026-09-29', status: 'done' });
    expect(week[6]).toEqual({ key: '2026-10-01', status: 'done' });
    expect(lastSevenDays(days(), '2026-10-01')[6].status).toBe('today');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/streak.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar `src/domain/streak.ts`**

```ts
import { addDays, weekKey } from './studyDay';

export const MIN_CARDS_FOR_DAY = 10;

export interface StreakInfo {
  days: number;
  freezeAvailable: boolean;
  countedToday: boolean;
}

export type DayStatus = 'done' | 'missed' | 'today';

export interface WeekDay {
  key: string;
  status: DayStatus;
}

export function countedDays(reviewsPerDay: Map<string, number>, completedDays: Iterable<string>): Set<string> {
  const counted = new Set(completedDays);
  for (const [day, n] of reviewsPerDay) if (n >= MIN_CARDS_FOR_DAY) counted.add(day);
  return counted;
}

export function computeStreak(counted: Set<string>, today: string): StreakInfo {
  const countedToday = counted.has(today);
  if (counted.size === 0) return { days: 0, freezeAvailable: true, countedToday };
  const earliest = [...counted].sort()[0];
  const usedFreeze = new Set<string>();
  let days = 0;
  let cursor = countedToday ? today : addDays(today, -1);
  while (cursor >= earliest) {
    if (counted.has(cursor)) {
      days++;
    } else {
      const week = weekKey(cursor);
      if (usedFreeze.has(week)) break;
      usedFreeze.add(week);
    }
    cursor = addDays(cursor, -1);
  }
  return { days, freezeAvailable: !usedFreeze.has(weekKey(today)), countedToday };
}

export function lastSevenDays(counted: Set<string>, today: string): WeekDay[] {
  const out: WeekDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = addDays(today, -i);
    const status: DayStatus = counted.has(key) ? 'done' : key === today ? 'today' : 'missed';
    out.push({ key, status });
  }
  return out;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/streak.test.ts` → Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/streak.ts src/domain/streak.test.ts
git commit -m "feat: sequência de dias com uma folga por semana"
```

---

### Task 7: Leitura tolerante de JSON (`cardJson.ts` — parte 1)

**Files:**
- Create: `src/domain/cardJson.ts`
- Test: `src/domain/cardJson.parse.test.ts`

**Interfaces:**
- Consumes: `FsrsState` (Task 3).
- Produces:
  - `interface ParsedCard { front: string; back: string; progress?: { id: string; createdAt: number; updatedAt: number; fsrs: FsrsState } }`
  - `interface ParsedDeck { name?: string; color?: string; cards: ParsedCard[] }`
  - `type ParseResult = { ok: true; decks: ParsedDeck[] } | { ok: false; error: string }`
  - `extractJson(text: string): string`
  - `parseCardJson(text: string): ParseResult`

Formatos aceitos (spec, seção 6): `{deck, cards}`; lista solta de cards; backup `{decks: [{deck, color, cards}]}`. Chaves aceitas: `front/back`, `frente/verso`, `question/answer`, `pergunta/resposta`. Cercas de código e texto antes/depois são ignorados.

- [ ] **Step 1: Escrever os testes**

Nos testes, a cerca de código é montada com `'`'.repeat(3)` para não quebrar este documento.

```ts
import { describe, expect, it } from 'vitest';
import { parseCardJson } from './cardJson';

const FENCE = '`'.repeat(3);

function ok(text: string) {
  const r = parseCardJson(text);
  if (!r.ok) throw new Error(`esperava sucesso: ${r.error}`);
  return r.decks;
}

function err(text: string) {
  const r = parseCardJson(text);
  if (r.ok) throw new Error('esperava erro');
  return r.error;
}

describe('parseCardJson', () => {
  it('lê o formato padrão', () => {
    const decks = ok('{"version":1,"deck":"História","cards":[{"front":"Ano?","back":"1789"}]}');
    expect(decks).toEqual([{ name: 'História', color: undefined, cards: [{ front: 'Ano?', back: '1789' }] }]);
  });

  it('ignora cercas de código e texto em volta', () => {
    const text = `Aqui estão teus cards:\n${FENCE}json\n{"deck":"X","cards":[{"front":"a","back":"b"}]}\n${FENCE}\nBons estudos!`;
    expect(ok(text)[0].cards).toEqual([{ front: 'a', back: 'b' }]);
  });

  it('aceita lista solta de cards (baralho escolhido depois)', () => {
    const decks = ok('[{"front":"a","back":"b"},{"front":"c","back":"d"}]');
    expect(decks[0].name).toBeUndefined();
    expect(decks[0].cards).toHaveLength(2);
  });

  it('aceita chaves em português e question/answer', () => {
    const decks = ok('[{"frente":"a","verso":"b"},{"question":"c","answer":"d"},{"pergunta":"e","resposta":"f"}]');
    expect(decks[0].cards.map((c) => c.back)).toEqual(['b', 'd', 'f']);
  });

  it('apara espaços', () => {
    expect(ok('[{"front":"  a  ","back":"\\n b "}]')[0].cards[0]).toEqual({ front: 'a', back: 'b' });
  });

  it('aponta o card sem verso', () => {
    expect(err('{"cards":[{"front":"a","back":"b"},{"front":"c"}]}')).toBe('O card 2 está sem verso.');
  });

  it('aponta o card com frente só de espaços', () => {
    expect(err('[{"front":"   ","back":"b"}]')).toBe('O card 1 está sem frente.');
  });

  it('explica JSON ilegível', () => {
    expect(err('isso não é json')).toContain('Não consegui ler o JSON');
  });

  it('explica quando não há lista de cards', () => {
    expect(err('{"deck":"X"}')).toContain('Não encontrei a lista de cards');
    expect(err('{"cards":[]}')).toBe('Nenhum card encontrado.');
  });

  it('lê backup com vários baralhos e progresso', () => {
    const fsrs = { due: 5, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1, learning_steps: 0, reps: 1, lapses: 0, state: 2 };
    const decks = ok(JSON.stringify({
      version: 1,
      decks: [
        { deck: 'A', color: '#2F5E8C', cards: [{ front: 'a', back: 'b', id: 'id-1', createdAt: 1, updatedAt: 2, fsrs }] },
        { deck: 'B', cards: [{ front: 'c', back: 'd' }] },
      ],
    }));
    expect(decks).toHaveLength(2);
    expect(decks[0].color).toBe('#2F5E8C');
    expect(decks[0].cards[0].progress).toEqual({ id: 'id-1', createdAt: 1, updatedAt: 2, fsrs });
    expect(decks[1].cards[0].progress).toBeUndefined();
  });

  it('no backup, o erro diz qual baralho', () => {
    expect(err('{"decks":[{"deck":"A","cards":[{"front":"a","back":"b"}]},{"deck":"B","cards":[{"front":"c"}]}]}'))
      .toBe('No baralho 2: O card 1 está sem verso.');
  });

  it('aguenta importação grande', () => {
    const cards = Array.from({ length: 5000 }, (_, i) => ({ front: `f${i}`, back: `b${i}` }));
    expect(ok(JSON.stringify({ cards }))[0].cards).toHaveLength(5000);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/cardJson.parse.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar `src/domain/cardJson.ts`**

```ts
import type { FsrsState } from './scheduler';

export interface ParsedCard {
  front: string;
  back: string;
  progress?: { id: string; createdAt: number; updatedAt: number; fsrs: FsrsState };
}

export interface ParsedDeck {
  name?: string;
  color?: string;
  cards: ParsedCard[];
}

export type ParseResult = { ok: true; decks: ParsedDeck[] } | { ok: false; error: string };

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const fail = (error: string): ParseResult => ({ ok: false, error });
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

function pickText(raw: Obj, keys: string[]): string {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : text;
  const starts = [body.indexOf('{'), body.indexOf('[')].filter((i) => i >= 0);
  if (starts.length === 0) return body.trim();
  const start = Math.min(...starts);
  const end = Math.max(body.lastIndexOf('}'), body.lastIndexOf(']'));
  return end > start ? body.slice(start, end + 1) : body.slice(start);
}

function parseCard(raw: unknown, i: number): ParsedCard | string {
  if (!isObj(raw)) return `O card ${i + 1} não está no formato certo.`;
  const front = pickText(raw, ['front', 'frente', 'question', 'pergunta']);
  const back = pickText(raw, ['back', 'verso', 'answer', 'resposta']);
  if (!front) return `O card ${i + 1} está sem frente.`;
  if (!back) return `O card ${i + 1} está sem verso.`;
  const card: ParsedCard = { front, back };
  if (typeof raw.id === 'string' && isObj(raw.fsrs) && typeof raw.fsrs.due === 'number') {
    card.progress = {
      id: raw.id,
      createdAt: num(raw.createdAt),
      updatedAt: num(raw.updatedAt),
      fsrs: raw.fsrs as unknown as FsrsState,
    };
  }
  return card;
}

export function parseCardJson(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(extractJson(text));
  } catch {
    return fail('Não consegui ler o JSON. Confira se copiaste a resposta inteira da IA.');
  }

  let rawDecks: { name?: unknown; color?: unknown; cards: unknown }[];
  if (Array.isArray(data)) {
    rawDecks = [{ cards: data }];
  } else if (isObj(data) && Array.isArray(data.decks)) {
    rawDecks = data.decks.map((d: unknown) =>
      isObj(d) ? { name: d.deck ?? d.name, color: d.color, cards: d.cards } : { cards: undefined },
    );
  } else if (isObj(data) && Array.isArray(data.cards)) {
    rawDecks = [{ name: data.deck ?? data.name, cards: data.cards }];
  } else {
    return fail('Não encontrei a lista de cards ("cards") no JSON.');
  }

  const multi = rawDecks.length > 1;
  const decks: ParsedDeck[] = [];
  for (const [di, rd] of rawDecks.entries()) {
    const prefix = multi ? `No baralho ${di + 1}: ` : '';
    if (!Array.isArray(rd.cards)) return fail(`${prefix}Não encontrei a lista de cards.`);
    const cards: ParsedCard[] = [];
    for (const [i, raw] of rd.cards.entries()) {
      const r = parseCard(raw, i);
      if (typeof r === 'string') return fail(prefix + r);
      cards.push(r);
    }
    decks.push({
      name: typeof rd.name === 'string' && rd.name.trim() ? rd.name.trim() : undefined,
      color: typeof rd.color === 'string' ? rd.color : undefined,
      cards,
    });
  }
  if (decks.every((d) => d.cards.length === 0)) return fail('Nenhum card encontrado.');
  return { ok: true, decks };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/cardJson.parse.test.ts` → Expected: PASS (12 testes).

- [ ] **Step 5: Commit**

```bash
git add src/domain/cardJson.ts src/domain/cardJson.parse.test.ts
git commit -m "feat: leitura tolerante de JSON de cards"
```

---

### Task 8: Exportação, avisos e prompt da IA (`cardJson.ts` — parte 2)

**Files:**
- Modify: `src/domain/cardJson.ts` (acrescentar no fim)
- Test: `src/domain/cardJson.export.test.ts`

**Interfaces:**
- Consumes: `Card`, `Deck` (Task 3), `parseCardJson`, `ParsedCard` (Task 7), `makeCard` (Task 4).
- Produces:
  - `serializeDeck(deck: { name: string }, cards: Card[], includeProgress: boolean): string`
  - `serializeBackup(entries: { deck: Deck; cards: Card[] }[]): string`
  - `MAX_BACK_LENGTH = 300`; `type ImportWarning = 'long' | 'duplicate'`
  - `findWarnings(cards: ParsedCard[], existing: { front: string; back: string }[]): (ImportWarning | null)[]`
  - `AI_PROMPT: string`

- [ ] **Step 1: Escrever os testes**

```ts
import { describe, expect, it } from 'vitest';
import { makeCard } from '../test/fixtures';
import { AI_PROMPT, findWarnings, parseCardJson, serializeBackup, serializeDeck } from './cardJson';
import type { Deck } from './types';

const deck: Deck = { id: 'd1', name: 'Inglês', color: '#2F5E8C', createdAt: 0, updatedAt: 0 };
const cards = [makeCard('c1', {}, { front: 'Put off', back: 'Adiar', createdAt: 1, updatedAt: 2 })];

describe('exportação', () => {
  it('sem progresso: só version, deck e front/back', () => {
    const json = JSON.parse(serializeDeck(deck, cards, false));
    expect(json).toEqual({ version: 1, deck: 'Inglês', cards: [{ front: 'Put off', back: 'Adiar' }] });
  });

  it('com progresso: ida e volta preserva id, datas e FSRS', () => {
    const r = parseCardJson(serializeDeck(deck, cards, true));
    if (!r.ok) throw new Error(r.error);
    expect(r.decks[0].cards[0].progress).toEqual({ id: 'c1', createdAt: 1, updatedAt: 2, fsrs: cards[0].fsrs });
  });

  it('backup com vários baralhos preserva cores', () => {
    const other: Deck = { ...deck, id: 'd2', name: 'Química', color: '#2D6E5E' };
    const r = parseCardJson(serializeBackup([{ deck, cards }, { deck: other, cards: [] }]));
    if (!r.ok) throw new Error(r.error);
    expect(r.decks.map((d) => [d.name, d.color])).toEqual([['Inglês', '#2F5E8C'], ['Química', '#2D6E5E']]);
  });
});

describe('findWarnings', () => {
  it('marca verso longo, duplicata do baralho e duplicata no próprio lote', () => {
    const w = findWarnings(
      [
        { front: 'a', back: 'x'.repeat(301) },
        { front: 'Put  OFF', back: 'adiar' },
        { front: 'b', back: 'c' },
        { front: 'b', back: 'c' },
        { front: 'ok', back: 'x'.repeat(300) },
      ],
      [{ front: 'Put off', back: 'Adiar' }],
    );
    expect(w).toEqual(['long', 'duplicate', null, 'duplicate', null]);
  });
});

describe('AI_PROMPT', () => {
  it('pede o formato JSON com front/back e cards curtos', () => {
    expect(AI_PROMPT).toContain('"front"');
    expect(AI_PROMPT).toContain('"back"');
    expect(AI_PROMPT).toContain('200 caracteres');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/cardJson.export.test.ts` → Expected: FAIL (funções não exportadas).

- [ ] **Step 3: Acrescentar ao fim de `src/domain/cardJson.ts`**

Adicione também `import type { Card, Deck } from './types';` no topo do arquivo.

```ts
function cardToJson(c: Card, includeProgress: boolean) {
  if (!includeProgress) return { front: c.front, back: c.back };
  return { front: c.front, back: c.back, id: c.id, createdAt: c.createdAt, updatedAt: c.updatedAt, fsrs: c.fsrs };
}

export function serializeDeck(deck: { name: string }, cards: Card[], includeProgress: boolean): string {
  return JSON.stringify(
    { version: 1, deck: deck.name, cards: cards.map((c) => cardToJson(c, includeProgress)) },
    null,
    2,
  );
}

export function serializeBackup(entries: { deck: Deck; cards: Card[] }[]): string {
  return JSON.stringify(
    {
      version: 1,
      decks: entries.map(({ deck, cards }) => ({
        deck: deck.name,
        color: deck.color,
        cards: cards.map((c) => cardToJson(c, true)),
      })),
    },
    null,
    2,
  );
}

export const MAX_BACK_LENGTH = 300;
export type ImportWarning = 'long' | 'duplicate';

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const cardKey = (c: { front: string; back: string }) => `${normalize(c.front)}\u0000${normalize(c.back)}`;

export function findWarnings(
  cards: ParsedCard[],
  existing: { front: string; back: string }[],
): (ImportWarning | null)[] {
  const seen = new Set(existing.map(cardKey));
  return cards.map((c) => {
    const key = cardKey(c);
    const duplicate = seen.has(key);
    seen.add(key);
    if (duplicate) return 'duplicate';
    if (c.back.length > MAX_BACK_LENGTH) return 'long';
    return null;
  });
}

export const AI_PROMPT = `Crie flashcards para eu estudar com repetição espaçada.

Tema: [ESCREVA AQUI O TEMA E O NÍVEL, ex.: "phrasal verbs de inglês, nível intermediário"]
Quantidade: 20 cards

Regras:
- Um único fato ou ideia por card.
- Pergunta clara na frente; resposta curta no verso (menos de 200 caracteres).
- Sem cards duplicados ou vagos.

Responda SOMENTE com JSON válido neste formato, sem texto antes ou depois:
{
  "version": 1,
  "deck": "Nome do baralho",
  "cards": [
    { "front": "Pergunta", "back": "Resposta" }
  ]
}`;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain` → Expected: PASS (todos os testes do domínio).

- [ ] **Step 5: Commit**

```bash
git add src/domain/cardJson.ts src/domain/cardJson.export.test.ts
git commit -m "feat: exportação JSON, avisos de importação e prompt para IA"
```

---

### Task 9: Banco local, baralhos e cards (`db.ts`, `decks.ts`, `cards.ts`)

**Files:**
- Create: `src/domain/id.ts`, `src/data/db.ts`, `src/data/decks.ts`, `src/data/cards.ts`, `src/test/resetDb.ts`
- Test: `src/domain/id.test.ts`, `src/data/decks.test.ts`, `src/data/cards.test.ts`

**Interfaces:**
- Consumes: `Deck`, `Card`, `ReviewLog`, `Settings` (Task 3), `newFsrsState` (Task 3).
- Produces:
  - `newId(): string`, `uuidFromBytes(bytes: Uint8Array): string` (UUID v4; funciona também fora de HTTPS, onde `crypto.randomUUID` não existe).
  - `db` (Dexie) com tabelas `decks`, `cards`, `reviewLogs`, `settings`, `completedDays` (`{ day: string }`).
  - `resetDb(): Promise<void>` (só testes: limpa todas as tabelas).
  - `decks.ts`: `DECK_COLORS: string[]`, `createDeck(name: string, color?: string, now?: number): Promise<Deck>`, `updateDeck(id: string, patch: { name?: string; color?: string }, now?: number): Promise<Deck>`, `getDeck(id: string): Promise<Deck | null>`, `listDecks(): Promise<Deck[]>` (ativos, mais antigo primeiro), `deleteDeck(id: string, now?: number): Promise<void>`, `restoreDeck(id: string, now?: number): Promise<void>`.
  - `cards.ts`: `createCard(deckId: string, front: string, back: string, now?: number): Promise<Card>`, `updateCard(id: string, patch: { front?: string; back?: string; deckId?: string }, now?: number): Promise<Card>`, `getCard(id: string): Promise<Card | null>`, `listDeckCards(deckId: string): Promise<Card[]>` (mais novo primeiro), `listActiveCards(): Promise<Card[]>` (cards ativos de baralhos ativos), `deleteCard(id: string, now?: number): Promise<void>`, `restoreCard(id: string, now?: number): Promise<void>`.
  - Erro de validação: `createCard`/`updateCard` lançam `Error('Frente e verso são obrigatórios.')` se frente ou verso ficarem vazios depois do `trim`.

- [ ] **Step 1: Teste e implementação do `newId`**

`src/domain/id.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { newId, uuidFromBytes } from './id';

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newId', () => {
  it('gera UUID v4 únicos', () => {
    const a = newId();
    expect(a).toMatch(V4);
    expect(newId()).not.toBe(a);
  });
  it('monta UUID v4 a partir de bytes aleatórios (sem randomUUID)', () => {
    expect(uuidFromBytes(new Uint8Array(16).fill(255))).toMatch(V4);
  });
});
```

Run: `npx vitest run src/domain/id.test.ts` → Expected: FAIL.

`src/domain/id.ts`:

```ts
export function uuidFromBytes(bytes: Uint8Array): string {
  const b = Uint8Array.from(bytes);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** UUID v4. `crypto.randomUUID` só existe em HTTPS/localhost; no celular via IP da rede usamos o fallback. */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return uuidFromBytes(crypto.getRandomValues(new Uint8Array(16)));
}
```

Run: `npx vitest run src/domain/id.test.ts` → Expected: PASS.

- [ ] **Step 2: Criar `src/data/db.ts` e `src/test/resetDb.ts`**

```ts
import Dexie, { type Table } from 'dexie';
import type { Card, Deck, ReviewLog, Settings } from '../domain/types';

export interface CompletedDay {
  day: string;
}

export class LembraDB extends Dexie {
  decks!: Table<Deck, string>;
  cards!: Table<Card, string>;
  reviewLogs!: Table<ReviewLog, string>;
  settings!: Table<Settings, string>;
  completedDays!: Table<CompletedDay, string>;

  constructor(name = 'lembra') {
    super(name);
    this.version(1).stores({
      decks: 'id, updatedAt',
      cards: 'id, deckId, updatedAt',
      reviewLogs: 'id, cardId, reviewedAt',
      settings: 'id',
      completedDays: 'day',
    });
  }
}

export const db = new LembraDB();
```

`src/test/resetDb.ts`:

```ts
import { db } from '../data/db';

export async function resetDb(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()));
}
```

- [ ] **Step 3: Escrever os testes de baralhos**

`src/data/decks.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../test/resetDb';
import { createCard, deleteCard, getCard, listDeckCards } from './cards';
import { createDeck, deleteDeck, getDeck, listDecks, restoreDeck, updateDeck } from './decks';

beforeEach(resetDb);

describe('decks', () => {
  it('cria e lista em ordem de criação', async () => {
    await createDeck('B', '#2F5E8C', 2);
    await createDeck('A', '#B5482A', 1);
    expect((await listDecks()).map((d) => d.name)).toEqual(['A', 'B']);
  });

  it('apara o nome e recusa nome vazio', async () => {
    expect((await createDeck('  Inglês  ')).name).toBe('Inglês');
    await expect(createDeck('   ')).rejects.toThrow('O baralho precisa de um nome.');
  });

  it('renomeia e troca a cor', async () => {
    const d = await createDeck('Velho', '#2F5E8C', 1);
    const u = await updateDeck(d.id, { name: 'Novo', color: '#B5482A' }, 5);
    expect(u).toMatchObject({ name: 'Novo', color: '#B5482A', updatedAt: 5 });
  });

  it('apagar esconde o baralho e seus cards; restaurar traz de volta só os que caíram junto', async () => {
    const d = await createDeck('Química', undefined, 1);
    const keep = await createCard(d.id, 'a', 'b', 1);
    const gone = await createCard(d.id, 'c', 'd', 2);
    await deleteCard(gone.id, 3);
    await deleteDeck(d.id, 4);
    expect(await getDeck(d.id)).toBeNull();
    expect(await listDecks()).toHaveLength(0);
    await restoreDeck(d.id, 5);
    expect((await getDeck(d.id))?.name).toBe('Química');
    expect((await listDeckCards(d.id)).map((c) => c.id)).toEqual([keep.id]);
    expect(await getCard(gone.id)).toBeNull();
  });
});
```

- [ ] **Step 4: Escrever os testes de cards**

`src/data/cards.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { isNew } from '../domain/scheduler';
import { resetDb } from '../test/resetDb';
import { createCard, deleteCard, getCard, listActiveCards, listDeckCards, restoreCard, updateCard } from './cards';
import { createDeck, deleteDeck } from './decks';

beforeEach(resetDb);

describe('cards', () => {
  it('cria card novo com texto aparado', async () => {
    const d = await createDeck('X');
    const c = await createCard(d.id, '  Frente ', ' Verso  ', 10);
    expect(c).toMatchObject({ deckId: d.id, front: 'Frente', back: 'Verso', createdAt: 10, updatedAt: 10 });
    expect(isNew(c.fsrs)).toBe(true);
  });

  it('recusa frente ou verso só com espaços', async () => {
    const d = await createDeck('X');
    await expect(createCard(d.id, '   ', 'b')).rejects.toThrow('Frente e verso são obrigatórios.');
    await expect(createCard(d.id, 'a', '\n ')).rejects.toThrow('Frente e verso são obrigatórios.');
  });

  it('edita texto e baralho', async () => {
    const d1 = await createDeck('A');
    const d2 = await createDeck('B');
    const c = await createCard(d1.id, 'a', 'b', 1);
    const u = await updateCard(c.id, { front: ' novo ', deckId: d2.id }, 9);
    expect(u).toMatchObject({ front: 'novo', back: 'b', deckId: d2.id, updatedAt: 9 });
    await expect(updateCard(c.id, { back: ' ' })).rejects.toThrow('Frente e verso são obrigatórios.');
  });

  it('lista cards do baralho do mais novo para o mais antigo', async () => {
    const d = await createDeck('X');
    await createCard(d.id, 'primeiro', 'b', 1);
    await createCard(d.id, 'segundo', 'b', 2);
    expect((await listDeckCards(d.id)).map((c) => c.front)).toEqual(['segundo', 'primeiro']);
  });

  it('apagar e restaurar card', async () => {
    const d = await createDeck('X');
    const c = await createCard(d.id, 'a', 'b', 1);
    await deleteCard(c.id, 2);
    expect(await getCard(c.id)).toBeNull();
    expect(await listDeckCards(d.id)).toHaveLength(0);
    await restoreCard(c.id, 3);
    expect((await getCard(c.id))?.updatedAt).toBe(3);
  });

  it('listActiveCards ignora cards de baralhos apagados', async () => {
    const d1 = await createDeck('A');
    const d2 = await createDeck('B');
    await createCard(d1.id, 'a', 'b');
    await createCard(d2.id, 'c', 'd');
    await deleteDeck(d2.id);
    expect((await listActiveCards()).map((c) => c.front)).toEqual(['a']);
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npx vitest run src/data` → Expected: FAIL (módulos não existem).

- [ ] **Step 6: Implementar `src/data/decks.ts`**

```ts
import { newId } from '../domain/id';
import type { Deck } from '../domain/types';
import { db } from './db';

export const DECK_COLORS = ['#2F5E8C', '#B5482A', '#2D6E5E', '#8A6412', '#6B4E8C'];

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('O baralho precisa de um nome.');
  return trimmed;
}

export async function createDeck(name: string, color = DECK_COLORS[0], now = Date.now()): Promise<Deck> {
  const deck: Deck = { id: newId(), name: cleanName(name), color, createdAt: now, updatedAt: now };
  await db.decks.add(deck);
  return deck;
}

export async function updateDeck(
  id: string,
  patch: { name?: string; color?: string },
  now = Date.now(),
): Promise<Deck> {
  const current = await db.decks.get(id);
  if (!current) throw new Error('Baralho não encontrado.');
  const updated: Deck = {
    ...current,
    ...(patch.name !== undefined ? { name: cleanName(patch.name) } : {}),
    ...(patch.color !== undefined ? { color: patch.color } : {}),
    updatedAt: now,
  };
  await db.decks.put(updated);
  return updated;
}

export async function getDeck(id: string): Promise<Deck | null> {
  const deck = await db.decks.get(id);
  return deck && deck.deletedAt === undefined ? deck : null;
}

export async function listDecks(): Promise<Deck[]> {
  const all = await db.decks.toArray();
  return all.filter((d) => d.deletedAt === undefined).sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteDeck(id: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', [db.decks, db.cards], async () => {
    await db.decks.update(id, { deletedAt: now, updatedAt: now });
    await db.cards
      .where('deckId')
      .equals(id)
      .filter((c) => c.deletedAt === undefined)
      .modify({ deletedAt: now, updatedAt: now });
  });
}

export async function restoreDeck(id: string, now = Date.now()): Promise<void> {
  await db.transaction('rw', [db.decks, db.cards], async () => {
    const deck = await db.decks.get(id);
    if (!deck || deck.deletedAt === undefined) return;
    const deletedAt = deck.deletedAt;
    await db.decks.where('id').equals(id).modify((d) => {
      delete d.deletedAt;
      d.updatedAt = now;
    });
    await db.cards
      .where('deckId')
      .equals(id)
      .filter((c) => c.deletedAt === deletedAt)
      .modify((c) => {
        delete c.deletedAt;
        c.updatedAt = now;
      });
  });
}
```

- [ ] **Step 7: Implementar `src/data/cards.ts`**

```ts
import { newId } from '../domain/id';
import { newFsrsState } from '../domain/scheduler';
import type { Card } from '../domain/types';
import { db } from './db';
import { listDecks } from './decks';

function cleanText(front: string, back: string): { front: string; back: string } {
  const f = front.trim();
  const b = back.trim();
  if (!f || !b) throw new Error('Frente e verso são obrigatórios.');
  return { front: f, back: b };
}

export async function createCard(deckId: string, front: string, back: string, now = Date.now()): Promise<Card> {
  const card: Card = {
    id: newId(),
    deckId,
    ...cleanText(front, back),
    createdAt: now,
    updatedAt: now,
    fsrs: newFsrsState(now),
  };
  await db.cards.add(card);
  return card;
}

export async function updateCard(
  id: string,
  patch: { front?: string; back?: string; deckId?: string },
  now = Date.now(),
): Promise<Card> {
  const current = await db.cards.get(id);
  if (!current) throw new Error('Card não encontrado.');
  const text = cleanText(patch.front ?? current.front, patch.back ?? current.back);
  const updated: Card = { ...current, ...text, deckId: patch.deckId ?? current.deckId, updatedAt: now };
  await db.cards.put(updated);
  return updated;
}

export async function getCard(id: string): Promise<Card | null> {
  const card = await db.cards.get(id);
  return card && card.deletedAt === undefined ? card : null;
}

export async function listDeckCards(deckId: string): Promise<Card[]> {
  const cards = await db.cards.where('deckId').equals(deckId).toArray();
  return cards.filter((c) => c.deletedAt === undefined).sort((a, b) => b.createdAt - a.createdAt);
}

export async function listActiveCards(): Promise<Card[]> {
  const deckIds = new Set((await listDecks()).map((d) => d.id));
  const cards = await db.cards.toArray();
  return cards.filter((c) => c.deletedAt === undefined && deckIds.has(c.deckId));
}

export async function deleteCard(id: string, now = Date.now()): Promise<void> {
  await db.cards.update(id, { deletedAt: now, updatedAt: now });
}

export async function restoreCard(id: string, now = Date.now()): Promise<void> {
  await db.cards.where('id').equals(id).modify((c) => {
    delete c.deletedAt;
    c.updatedAt = now;
  });
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run src/data src/domain/id.test.ts` → Expected: PASS (12 testes).

- [ ] **Step 9: Commit**

```bash
git add src/domain/id.ts src/domain/id.test.ts src/data src/test/resetDb.ts
git commit -m "feat: banco local com baralhos e cards, apagamento lógico e desfazer"
```

---

### Task 10: Ajustes e respostas (`settings.ts`, `reviews.ts`)

**Files:**
- Create: `src/data/settings.ts`, `src/data/reviews.ts`
- Test: `src/data/settings.test.ts`, `src/data/reviews.test.ts`

**Interfaces:**
- Consumes: `db` (Task 9), `DEFAULT_SETTINGS`, `Settings`, `Rating`, `Card`, `ReviewLog` (Task 3), `Scheduler`, `createScheduler` (Task 3), `newId` (Task 9).
- Produces:
  - `getSettings(): Promise<Settings>` (sempre completo, com padrões), `updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings>`.
  - `answerCard(cardId: string, rating: Rating, scheduler: Scheduler, now?: number): Promise<{ card: Card; log: ReviewLog }>`
  - `undoAnswer(logId: string, now?: number): Promise<Card>`
  - `logsBetween(from: number, to: number): Promise<ReviewLog[]>` (inclui `from`, exclui `to`)

- [ ] **Step 1: Escrever os testes**

`src/data/settings.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/types';
import { resetDb } from '../test/resetDb';
import { getSettings, updateSettings } from './settings';

beforeEach(resetDb);

describe('settings', () => {
  it('devolve os padrões quando não há nada salvo', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('salva alterações parciais', async () => {
    await updateSettings({ minutesPerDay: 20 });
    await updateSettings({ onboardedAt: 5 });
    expect(await getSettings()).toEqual({ ...DEFAULT_SETTINGS, minutesPerDay: 20, onboardedAt: 5 });
  });
});
```

`src/data/reviews.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createScheduler } from '../domain/scheduler';
import { resetDb } from '../test/resetDb';
import { createCard, getCard } from './cards';
import { db } from './db';
import { createDeck } from './decks';
import { answerCard, logsBetween, undoAnswer } from './reviews';

const sched = createScheduler(0.9, false);
beforeEach(resetDb);

async function oneCard() {
  const d = await createDeck('X');
  return createCard(d.id, 'a', 'b', 1);
}

describe('reviews', () => {
  it('responder atualiza o FSRS do card e registra o estado anterior', async () => {
    const c = await oneCard();
    const { card, log } = await answerCard(c.id, 3, sched, 100);
    expect(card.fsrs.reps).toBe(1);
    expect(card.updatedAt).toBe(100);
    expect(log).toMatchObject({ cardId: c.id, rating: 3, reviewedAt: 100, prevFsrs: c.fsrs });
    expect((await getCard(c.id))?.fsrs.reps).toBe(1);
  });

  it('desfazer restaura o estado exato e apaga o registro', async () => {
    const c = await oneCard();
    const { log } = await answerCard(c.id, 4, sched, 100);
    const restored = await undoAnswer(log.id, 200);
    expect(restored.fsrs).toEqual(c.fsrs);
    expect(await db.reviewLogs.count()).toBe(0);
  });

  it('logsBetween inclui o início e exclui o fim', async () => {
    const c = await oneCard();
    await answerCard(c.id, 3, sched, 100);
    await answerCard(c.id, 3, sched, 200);
    expect((await logsBetween(100, 200)).map((l) => l.reviewedAt)).toEqual([100]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/settings.test.ts src/data/reviews.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar `src/data/settings.ts`**

```ts
import { DEFAULT_SETTINGS, type Settings } from '../domain/types';
import { db } from './db';

export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get('settings');
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
  const next: Settings = { ...(await getSettings()), ...patch, id: 'settings' };
  await db.settings.put(next);
  return next;
}
```

- [ ] **Step 4: Implementar `src/data/reviews.ts`**

```ts
import { newId } from '../domain/id';
import type { Scheduler } from '../domain/scheduler';
import type { Card, Rating, ReviewLog } from '../domain/types';
import { db } from './db';

export async function answerCard(
  cardId: string,
  rating: Rating,
  scheduler: Scheduler,
  now = Date.now(),
): Promise<{ card: Card; log: ReviewLog }> {
  return db.transaction('rw', [db.cards, db.reviewLogs], async () => {
    const card = await db.cards.get(cardId);
    if (!card) throw new Error('Card não encontrado.');
    const updated: Card = { ...card, fsrs: scheduler.answer(card.fsrs, rating, now), updatedAt: now };
    const log: ReviewLog = { id: newId(), cardId, rating, reviewedAt: now, prevFsrs: card.fsrs };
    await db.cards.put(updated);
    await db.reviewLogs.add(log);
    return { card: updated, log };
  });
}

export async function undoAnswer(logId: string, now = Date.now()): Promise<Card> {
  return db.transaction('rw', [db.cards, db.reviewLogs], async () => {
    const log = await db.reviewLogs.get(logId);
    if (!log) throw new Error('Nada para desfazer.');
    const card = await db.cards.get(log.cardId);
    if (!card) throw new Error('Card não encontrado.');
    const restored: Card = { ...card, fsrs: log.prevFsrs, updatedAt: now };
    await db.cards.put(restored);
    await db.reviewLogs.delete(logId);
    return restored;
  });
}

export async function logsBetween(from: number, to: number): Promise<ReviewLog[]> {
  return db.reviewLogs.where('reviewedAt').between(from, to, true, false).toArray();
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/data` → Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/settings.ts src/data/settings.test.ts src/data/reviews.ts src/data/reviews.test.ts
git commit -m "feat: ajustes e registro de respostas com desfazer"
```

---

### Task 11: Visão do dia, sequência e previsão (`overview.ts`)

**Files:**
- Create: `src/data/overview.ts`
- Test: `src/data/overview.test.ts`

**Interfaces:**
- Consumes: `buildDailyQueue`, `DailyQueue` (Task 4); `createScheduler`, `State` (Task 3); `studyDayStart`, `studyDayEnd`, `studyDayKey` (Task 2); `computeStreak`, `countedDays`, `lastSevenDays`, `StreakInfo`, `WeekDay` (Task 6); `db`, `listDecks`, `listActiveCards` (Task 9); `getSettings`, `logsBetween` (Task 10).
- Produces:
  - `interface DeckOverview { deck: Deck; total: number; dueToday: number }`
  - `interface TodayOverview { queue: DailyQueue; decks: DeckOverview[]; streak: StreakInfo; backupDue: boolean; onboarded: boolean }`
  - `getTodayOverview(now: number): Promise<TodayOverview>`
  - `getStudyQueue(now: number, opts?: { deckId?: string; extraNew?: number }): Promise<DailyQueue>`
  - `getStreak(now: number): Promise<{ streak: StreakInfo; week: WeekDay[] }>`
  - `markDayCompleted(now: number): Promise<void>`
  - `forecastTomorrow(now: number): Promise<number>`
  - `BACKUP_INTERVAL_MS = 7 dias`, `BACKUP_MIN_CARDS = 20`

Observação: a spec diz que a sequência é calculada, sem contador guardado. O dia em que a fila foi zerada fica registrado em `completedDays` (um fato por dia, não um contador), porque isso não dá para deduzir só pelos registros de respostas.

- [ ] **Step 1: Escrever os testes**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { createScheduler } from '../domain/scheduler';
import { resetDb } from '../test/resetDb';
import { createCard } from './cards';
import { createDeck, deleteDeck } from './decks';
import { forecastTomorrow, getStreak, getStudyQueue, getTodayOverview, markDayCompleted } from './overview';
import { answerCard } from './reviews';
import { updateSettings } from './settings';

const now = new Date(2026, 8, 29, 10).getTime();
const sched = createScheduler(0.9, false);
beforeEach(resetDb);

async function deckWith(name: string, n: number, t0 = 0) {
  const d = await createDeck(name, undefined, t0);
  const cards = [];
  for (let i = 0; i < n; i++) cards.push(await createCard(d.id, `${name}${i}`, 'v', t0 + i));
  return { d, cards };
}

describe('overview', () => {
  it('soma a fila de todos os baralhos e conta cada baralho', async () => {
    await deckWith('A', 3, 0);
    await deckWith('B', 2, 100);
    const o = await getTodayOverview(now);
    expect(o.queue.cards).toHaveLength(5);
    expect(o.decks.map((d) => [d.deck.name, d.total, d.dueToday])).toEqual([['A', 3, 3], ['B', 2, 2]]);
    expect(o.onboarded).toBe(false);
  });

  it('ignora baralho apagado e filtra por baralho', async () => {
    const a = await deckWith('A', 2, 0);
    const b = await deckWith('B', 2, 100);
    expect((await getStudyQueue(now, { deckId: a.d.id })).cards).toHaveLength(2);
    await deleteDeck(b.d.id);
    expect((await getStudyQueue(now)).cards).toHaveLength(2);
  });

  it('cards novos respondidos hoje descontam do limite de novos', async () => {
    const { cards } = await deckWith('A', 12);
    await answerCard(cards[0].id, 4, sched, now);
    expect((await getStudyQueue(now)).newCount).toBe(9);
  });

  it('10 respostas no dia contam para a sequência', async () => {
    const { cards } = await deckWith('A', 10);
    for (const c of cards) await answerCard(c.id, 4, sched, now);
    expect((await getStreak(now)).streak).toMatchObject({ days: 1, countedToday: true });
  });

  it('fila zerada marca o dia', async () => {
    await markDayCompleted(now);
    const { streak, week } = await getStreak(now);
    expect(streak.days).toBe(1);
    expect(week[6]).toEqual({ key: '2026-09-29', status: 'done' });
  });

  it('pede backup com 20 cards e nenhum export recente', async () => {
    await deckWith('A', 20);
    expect((await getTodayOverview(now)).backupDue).toBe(true);
    await updateSettings({ lastExportAt: now - 1000 });
    expect((await getTodayOverview(now)).backupDue).toBe(false);
  });

  it('previsão de amanhã usa o limite de novos', async () => {
    await deckWith('A', 12);
    expect(await forecastTomorrow(now)).toBe(10);
  });

  it('onboarded reflete o ajuste', async () => {
    await updateSettings({ onboardedAt: now });
    expect((await getTodayOverview(now)).onboarded).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/overview.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar `src/data/overview.ts`**

```ts
import { buildDailyQueue, type DailyQueue, type QueueInput } from '../domain/queue';
import { createScheduler, State } from '../domain/scheduler';
import { computeStreak, countedDays, lastSevenDays, type StreakInfo, type WeekDay } from '../domain/streak';
import { studyDayEnd, studyDayKey, studyDayStart } from '../domain/studyDay';
import type { Deck } from '../domain/types';
import { listActiveCards } from './cards';
import { db } from './db';
import { listDecks } from './decks';
import { logsBetween } from './reviews';
import { getSettings } from './settings';

const DAY_MS = 86_400_000;
export const BACKUP_INTERVAL_MS = 7 * DAY_MS;
export const BACKUP_MIN_CARDS = 20;

export interface DeckOverview {
  deck: Deck;
  total: number;
  dueToday: number;
}

export interface TodayOverview {
  queue: DailyQueue;
  decks: DeckOverview[];
  streak: StreakInfo;
  backupDue: boolean;
  onboarded: boolean;
}

async function todayContext(now: number): Promise<Omit<QueueInput, 'cards' | 'extraNew'>> {
  const settings = await getSettings();
  const scheduler = createScheduler(settings.desiredRetention);
  const logs = await logsBetween(studyDayStart(now, settings.dayStartHour), studyDayEnd(now, settings.dayStartHour));
  const newStudiedToday = logs.filter((l) => l.prevFsrs.state === State.New).length;
  return {
    now,
    settings,
    newStudiedToday,
    reviewsDoneToday: logs.length - newStudiedToday,
    retrievability: scheduler.retrievability,
  };
}

export async function getStudyQueue(
  now: number,
  opts: { deckId?: string; extraNew?: number } = {},
): Promise<DailyQueue> {
  const [ctx, all] = await Promise.all([todayContext(now), listActiveCards()]);
  const cards = opts.deckId ? all.filter((c) => c.deckId === opts.deckId) : all;
  return buildDailyQueue({ ...ctx, cards, extraNew: opts.extraNew });
}

export async function getStreak(now: number): Promise<{ streak: StreakInfo; week: WeekDay[] }> {
  const settings = await getSettings();
  const [logs, completed] = await Promise.all([db.reviewLogs.toArray(), db.completedDays.toArray()]);
  const perDay = new Map<string, number>();
  for (const l of logs) {
    const key = studyDayKey(l.reviewedAt, settings.dayStartHour);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }
  const counted = countedDays(perDay, completed.map((c) => c.day));
  const today = studyDayKey(now, settings.dayStartHour);
  return { streak: computeStreak(counted, today), week: lastSevenDays(counted, today) };
}

export async function getTodayOverview(now: number): Promise<TodayOverview> {
  const [ctx, decks, cards, { streak }] = await Promise.all([
    todayContext(now),
    listDecks(),
    listActiveCards(),
    getStreak(now),
  ]);
  const queue = buildDailyQueue({ ...ctx, cards });
  const deckOverviews = decks.map((deck) => {
    const deckCards = cards.filter((c) => c.deckId === deck.id);
    return { deck, total: deckCards.length, dueToday: buildDailyQueue({ ...ctx, cards: deckCards }).cards.length };
  });
  const { lastExportAt, onboardedAt } = ctx.settings;
  const backupDue =
    cards.length >= BACKUP_MIN_CARDS && (lastExportAt === undefined || now - lastExportAt > BACKUP_INTERVAL_MS);
  return { queue, decks: deckOverviews, streak, backupDue, onboarded: onboardedAt !== undefined };
}

export async function markDayCompleted(now: number): Promise<void> {
  const settings = await getSettings();
  await db.completedDays.put({ day: studyDayKey(now, settings.dayStartHour) });
}

export async function forecastTomorrow(now: number): Promise<number> {
  const settings = await getSettings();
  const tomorrow = studyDayEnd(now, settings.dayStartHour) + 3_600_000;
  const scheduler = createScheduler(settings.desiredRetention);
  const cards = await listActiveCards();
  return buildDailyQueue({
    cards,
    now: tomorrow,
    settings,
    newStudiedToday: 0,
    reviewsDoneToday: 0,
    retrievability: scheduler.retrievability,
  }).cards.length;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/data/overview.test.ts` → Expected: PASS (8 testes).

- [ ] **Step 5: Commit**

```bash
git add src/data/overview.ts src/data/overview.test.ts
git commit -m "feat: visão do dia, sequência e previsão de amanhã"
```

---

### Task 12: Importar e exportar no banco (`importExport.ts`)

**Files:**
- Create: `src/data/importExport.ts`
- Test: `src/data/importExport.test.ts`

**Interfaces:**
- Consumes: `ParsedDeck`, `serializeDeck`, `serializeBackup`, `parseCardJson` (Tasks 7–8); `db`, `DECK_COLORS`, `getDeck`, `listDecks`, `listDeckCards` (Task 9); `updateSettings` (Task 10); `newId`, `newFsrsState`.
- Produces:
  - `importParsed(decks: ParsedDeck[], opts?: { targetDeckId?: string }, now?: number): Promise<{ imported: number; deckIds: string[] }>` — tudo numa transação: se algo falhar, nada fica salvo.
  - `exportDeckJson(deckId: string, includeProgress: boolean): Promise<string>`
  - `exportBackupJson(): Promise<string>`
  - `markExported(now: number): Promise<void>`

Regras: com `targetDeckId` e um único baralho, os cards vão para ele. Senão, usa o baralho ativo com o mesmo nome, ou cria um novo (nome do JSON ou "Importados"). Cards sem progresso entram como novos, com `createdAt = now + índice` para manter a ordem. Cards com progresso: se o `id` já existe e o registro do banco tem `updatedAt` maior ou igual, ele é mantido (e não conta como importado); senão o do arquivo vence.

- [ ] **Step 1: Escrever os testes**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { parseCardJson, type ParsedDeck } from '../domain/cardJson';
import { createScheduler } from '../domain/scheduler';
import { resetDb } from '../test/resetDb';
import { createCard, getCard, listDeckCards } from './cards';
import { db } from './db';
import { createDeck, listDecks } from './decks';
import { exportBackupJson, exportDeckJson, importParsed, markExported } from './importExport';
import { answerCard } from './reviews';
import { getSettings } from './settings';

beforeEach(resetDb);

const parsed = (text: string): ParsedDeck[] => {
  const r = parseCardJson(text);
  if (!r.ok) throw new Error(r.error);
  return r.decks;
};

describe('importParsed', () => {
  it('cria baralho novo com o nome do JSON, mantendo a ordem', async () => {
    const r = await importParsed(parsed('{"deck":"História","cards":[{"front":"1","back":"a"},{"front":"2","back":"b"}]}'), {}, 100);
    expect(r.imported).toBe(2);
    const [deck] = await listDecks();
    expect(deck.name).toBe('História');
    expect((await listDeckCards(deck.id)).map((c) => c.front)).toEqual(['2', '1']);
  });

  it('usa o baralho de destino escolhido', async () => {
    const d = await createDeck('Meu');
    await importParsed(parsed('[{"front":"a","back":"b"}]'), { targetDeckId: d.id });
    expect(await listDeckCards(d.id)).toHaveLength(1);
    expect(await listDecks()).toHaveLength(1);
  });

  it('junta no baralho existente de mesmo nome', async () => {
    const d = await createDeck('História');
    await importParsed(parsed('{"deck":"História","cards":[{"front":"a","back":"b"}]}'));
    expect(await listDecks()).toHaveLength(1);
    expect(await listDeckCards(d.id)).toHaveLength(1);
  });

  it('lista solta sem destino vai para "Importados"', async () => {
    await importParsed(parsed('[{"front":"a","back":"b"}]'));
    expect((await listDecks())[0].name).toBe('Importados');
  });

  it('backup restaura progresso; o registro mais recente vence', async () => {
    const d = await createDeck('Inglês', undefined, 1);
    const c = await createCard(d.id, 'a', 'b', 1);
    await answerCard(c.id, 4, createScheduler(0.9, false), 50);
    const backup = await exportBackupJson();
    await resetDb();
    const first = await importParsed(parsed(backup), {}, 1000);
    expect(first.imported).toBe(1);
    expect((await getCard(c.id))?.fsrs.reps).toBe(1);
    const again = await importParsed(parsed(backup), {}, 2000);
    expect(again.imported).toBe(0);
  });

  it('é atômico: se um card falha, nada é salvo', async () => {
    const decks: ParsedDeck[] = [
      {
        name: 'Quebrado',
        cards: [
          { front: 'ok', back: 'ok' },
          { front: 'x', back: 'y', progress: { id: undefined as unknown as string, createdAt: 0, updatedAt: 0, fsrs: {} as never } },
        ],
      },
    ];
    await expect(importParsed(decks)).rejects.toThrow();
    expect(await db.decks.count()).toBe(0);
    expect(await db.cards.count()).toBe(0);
  });
});

describe('exportação', () => {
  it('exporta baralho em ordem de criação', async () => {
    const d = await createDeck('Inglês');
    await createCard(d.id, 'primeiro', 'x', 1);
    await createCard(d.id, 'segundo', 'y', 2);
    const json = JSON.parse(await exportDeckJson(d.id, false));
    expect(json.cards.map((c: { front: string }) => c.front)).toEqual(['primeiro', 'segundo']);
  });

  it('markExported grava a data', async () => {
    await markExported(123);
    expect((await getSettings()).lastExportAt).toBe(123);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/importExport.test.ts` → Expected: FAIL.

- [ ] **Step 3: Implementar `src/data/importExport.ts`**

```ts
import { serializeBackup, serializeDeck, type ParsedDeck } from '../domain/cardJson';
import { newId } from '../domain/id';
import { newFsrsState } from '../domain/scheduler';
import type { Deck } from '../domain/types';
import { db } from './db';
import { DECK_COLORS, getDeck, listDecks } from './decks';
import { listDeckCards } from './cards';
import { updateSettings } from './settings';

export async function importParsed(
  decks: ParsedDeck[],
  opts: { targetDeckId?: string } = {},
  now = Date.now(),
): Promise<{ imported: number; deckIds: string[] }> {
  return db.transaction('rw', [db.decks, db.cards], async () => {
    const existing = (await db.decks.toArray()).filter((d) => d.deletedAt === undefined);
    let imported = 0;
    const deckIds: string[] = [];

    for (const [di, pd] of decks.entries()) {
      let deckId: string;
      if (opts.targetDeckId && decks.length === 1) {
        deckId = opts.targetDeckId;
      } else {
        const match = pd.name ? existing.find((d) => d.name === pd.name) : undefined;
        if (match) {
          deckId = match.id;
        } else {
          const deck: Deck = {
            id: newId(),
            name: pd.name ?? 'Importados',
            color: pd.color ?? DECK_COLORS[(existing.length + di) % DECK_COLORS.length],
            createdAt: now + di,
            updatedAt: now,
          };
          await db.decks.add(deck);
          existing.push(deck);
          deckId = deck.id;
        }
      }
      deckIds.push(deckId);

      for (const [i, pc] of pd.cards.entries()) {
        if (pc.progress) {
          const current = await db.cards.get(pc.progress.id);
          if (current && current.updatedAt >= pc.progress.updatedAt) continue;
          await db.cards.put({
            id: pc.progress.id,
            deckId,
            front: pc.front,
            back: pc.back,
            createdAt: pc.progress.createdAt || now + i,
            updatedAt: pc.progress.updatedAt || now,
            fsrs: pc.progress.fsrs,
          });
        } else {
          await db.cards.add({
            id: newId(),
            deckId,
            front: pc.front,
            back: pc.back,
            createdAt: now + i,
            updatedAt: now,
            fsrs: newFsrsState(now),
          });
        }
        imported++;
      }
    }
    return { imported, deckIds: [...new Set(deckIds)] };
  });
}

export async function exportDeckJson(deckId: string, includeProgress: boolean): Promise<string> {
  const deck = await getDeck(deckId);
  if (!deck) throw new Error('Baralho não encontrado.');
  const cards = (await listDeckCards(deckId)).reverse();
  return serializeDeck(deck, cards, includeProgress);
}

export async function exportBackupJson(): Promise<string> {
  const decks = await listDecks();
  const entries = await Promise.all(
    decks.map(async (deck) => ({ deck, cards: (await listDeckCards(deck.id)).reverse() })),
  );
  return serializeBackup(entries);
}

export async function markExported(now: number): Promise<void> {
  await updateSettings({ lastExportAt: now });
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS (todos os testes de domínio e dados).

- [ ] **Step 5: Commit**

```bash
git add src/data/importExport.ts src/data/importExport.test.ts
git commit -m "feat: importação atômica e exportação de baralhos e backup"
```

---

### Task 13: Fundação da interface (tema, rotas, menu, toast, folha, erros)

**Files:**
- Create: `src/ui/theme/tokens.css`, `src/ui/styles.css`, `src/ui/storage.ts`, `src/ui/share.ts`, `src/ui/components/Icon.tsx`, `src/ui/components/TabBar.tsx`, `src/ui/components/Toast.tsx`, `src/ui/components/BottomSheet.tsx`, `src/ui/components/ErrorScreen.tsx`, `src/app/App.tsx`, `src/ui/screens/{Today,Decks,Deck,CardEditor,Study,SessionEnd,Import,Settings,Welcome}.tsx` (provisórias), `playwright.config.ts`, `e2e/helpers.ts`, `e2e/shell.spec.ts`
- Modify: `src/main.tsx` (substituir todo)

**Interfaces:**
- Consumes: `db` (Task 9), `exportBackupJson` (Task 12).
- Produces:
  - Classes CSS de `styles.css` usadas por todas as telas (lista completa no arquivo).
  - `Icon({ name, size?, stroke? })` com `IconName = 'home' | 'decks' | 'settings' | 'plus' | 'close' | 'back' | 'undo' | 'more' | 'search' | 'download' | 'upload' | 'copy' | 'check' | 'flame' | 'arrow-right' | 'trash'`.
  - `TabBar({ createHref? })` — menu flutuante; aba ativa por rota (`/` Hoje, `/deck*` Baralhos, `/settings` Ajustes).
  - `ToastProvider`, `useToast(): (t: { message: string; action?: { label: string; onAction: () => void } }, ms?: number) => void`, `UNDO_MS = 6000`.
  - `BottomSheet({ open, title, onClose, children })`.
  - `ErrorScreen({ error })`, `ErrorBoundary`.
  - `share.ts`: `shareJson(filename: string, json: string): Promise<'shared' | 'downloaded' | 'cancelled'>`, `copyText(text: string): Promise<boolean>`, `slugify(name: string): string`.
  - `storage.ts`: `readLocal`, `writeLocal`, `readSession`, `writeSession` (nunca lançam), `requestPersistentStorage(): Promise<void>`.
  - Rotas (hash): `/`, `/welcome`, `/decks`, `/deck/:id`, `/study`, `/study/end`, `/card/new`, `/card/:id/edit`, `/import`, `/settings`.
  - `e2e/helpers.ts`: `openApp(page)`, `createDeck(page, name)`, `createCards(page, deckName, cards)`.

- [ ] **Step 1: Instalar Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Criar `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173',
    locale: 'pt-BR',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

- [ ] **Step 3: Escrever o teste e2e da casca do app**

`e2e/helpers.ts` (usado por todas as specs seguintes; `openApp` pula o onboarding, que chega na Task 21):

```ts
import { expect, type Page } from '@playwright/test';

export async function openApp(page: Page): Promise<void> {
  await page.goto('/');
  const skip = page.getByRole('button', { name: 'Pular' });
  if (await skip.isVisible().catch(() => false)) await skip.click();
}

export async function createDeck(page: Page, name: string): Promise<void> {
  await page.goto('/#/decks');
  await page.getByRole('button', { name: '+ Novo baralho' }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel('Nome do baralho').fill(name);
  await sheet.getByRole('button', { name: 'Criar baralho' }).click();
  await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
}

export async function createCards(page: Page, deckName: string, cards: [string, string][]): Promise<void> {
  await page.goto('/#/card/new');
  await page.getByLabel('Baralho').selectOption({ label: deckName });
  for (const [front, back] of cards) {
    await page.getByLabel('Frente').fill(front);
    await page.getByLabel('Verso').fill(back);
    await page.getByRole('button', { name: 'Salvar e próximo' }).click();
    await expect(page.getByLabel('Frente')).toHaveValue('');
  }
}
```

`e2e/shell.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('menu inferior navega entre Hoje, Baralhos e Ajustes', async ({ page }) => {
  await page.goto('/#/decks');
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  await expect(nav.getByRole('link', { name: 'Baralhos' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Ajustes' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(nav.getByRole('link', { name: 'Ajustes' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Criar card' })).toBeVisible();
});
```

Run: `npx playwright test e2e/shell.spec.ts` → Expected: FAIL (ainda não há menu).

- [ ] **Step 4: Criar `src/ui/theme/tokens.css`**

```css
:root {
  --paper: #f3eee4;
  --paper-2: #f7f2e8;
  --paper-3: #eae2d3;
  --card: #fffdf8;
  --ink: #1e1a16;
  --ink-2: #4a433c;
  --muted: #6b6259;
  --line: #e4dccd;
  --line-2: #d5cbb9;
  --accent: #b5482a;
  --nav-muted: #cfc6b6;
  --again-bg: #f6ddd5;
  --again-fg: #8a2e17;
  --hard-bg: #f3e6c8;
  --hard-fg: #6e4e0a;
  --good-bg: #d9e5f1;
  --good-fg: #1f4a73;
  --easy-bg: #d6eadf;
  --easy-fg: #1f5a45;
  --serif: 'Fraunces Variable', Georgia, serif;
  --sans: 'Instrument Sans', system-ui, sans-serif;
  --radius: 14px;
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}

button,
input,
textarea,
select {
  font: inherit;
  color: inherit;
}

a {
  color: inherit;
  text-decoration: none;
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Criar `src/ui/styles.css`**

```css
/* ---------- base ---------- */
.ruled {
  background-color: var(--card);
  background-image: linear-gradient(#e7a493, #e7a493),
    repeating-linear-gradient(to bottom, transparent 0, transparent 31px, #dce6f0 31px, #dce6f0 32px);
  background-size: 100% 2px, 100% 100%;
  background-position: 0 56px, 0 56px;
  background-repeat: no-repeat, repeat;
}
.ruled--tight { background-position: 0 44px, 0 44px; }
.screen {
  min-height: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: calc(20px + var(--safe-top)) 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.screen--tabs { padding-bottom: calc(120px + var(--safe-bottom)); }
.screen--focus { height: 100dvh; min-height: 0; padding-bottom: calc(24px + var(--safe-bottom)); }
.title-serif { font-family: var(--serif); font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.page-title { font-size: 30px; }
.section-title { font-size: 20px; }
.label { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.muted { color: var(--muted); }
.small { font-size: 13px; }
.spacer { flex: 1; }
.stack { display: flex; flex-direction: column; gap: 10px; }
.row-between { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.list { display: flex; flex-direction: column; gap: 10px; }

/* ---------- botões ---------- */
.icon-btn {
  width: 44px; height: 44px; flex-shrink: 0;
  border: none; background: transparent; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
}
.icon-btn:disabled { opacity: 0.35; cursor: default; }
.btn {
  height: 52px; padding: 0 18px; border-radius: 16px; border: 1px solid transparent;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 16px; font-weight: 600; cursor: pointer;
}
.btn:disabled { opacity: 0.45; cursor: default; }
.btn--primary { background: var(--ink); color: var(--card); }
.btn--secondary { background: var(--card); border-color: var(--line-2); }
.btn--danger { background: var(--again-bg); color: var(--again-fg); }
.btn--block { width: 100%; }
.link-btn { border: none; background: none; padding: 10px 0; color: var(--accent); font-size: 14px; font-weight: 600; cursor: pointer; }
.pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px;
  background: var(--card); border: 1px solid var(--line); border-radius: 999px; font-size: 14px; font-weight: 600;
}
.pill svg { color: var(--accent); }

/* ---------- topo das telas ---------- */
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 -10px; }
.topbar__title { font-family: var(--serif); font-size: 20px; font-weight: 600; margin: 0; }

/* ---------- Hoje ---------- */
.today__date { margin: 0 0 2px; font-size: 13px; font-weight: 500; color: var(--muted); }
.today__greeting { font-size: 28px; }
.hero-stack { position: relative; padding-bottom: 12px; }
.hero-stack::before, .hero-stack::after { content: ''; position: absolute; border-radius: 20px; }
.hero-stack::before { left: 14px; right: 14px; top: 16px; bottom: 0; background: var(--paper-3); }
.hero-stack::after { left: 6px; right: 6px; top: 8px; bottom: 6px; background: var(--paper-2); border: 1px solid var(--line); }
.hero {
  position: relative; z-index: 1; min-height: 280px; padding: 20px 22px;
  border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 14px 30px -20px rgba(60, 40, 20, 0.45);
  display: flex; flex-direction: column; gap: 6px;
}
.hero__count { display: flex; align-items: baseline; gap: 10px; margin-top: 18px; }
.hero__number { font-family: var(--serif); font-size: 88px; line-height: 1; font-weight: 600; letter-spacing: -0.04em; }
.hero__unit { font-family: var(--serif); font-size: 22px; }
.hero__meta { margin: 0 0 auto; font-size: 15px; color: var(--ink-2); }
.hero__empty { font-family: var(--serif); font-size: 24px; margin: 28px 0 auto; }
.notice {
  display: flex; align-items: center; gap: 10px; padding: 10px 6px 10px 14px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); font-size: 14px;
}
.notice p { margin: 0; flex: 1; }

/* ---------- baralhos ---------- */
.deck-row {
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
}
.deck-row__bar { width: 10px; height: 36px; border-radius: 3px; flex-shrink: 0; }
.deck-row__text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.deck-row__name { font-size: 16px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deck-row__meta { font-size: 13px; color: var(--muted); }
.deck-row__done { font-size: 13px; font-weight: 600; color: var(--easy-fg); }
.badge { font-size: 14px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: var(--paper); }
.empty { padding: 32px 8px; text-align: center; color: var(--muted); display: flex; flex-direction: column; gap: 14px; align-items: center; }
.empty__title { font-family: var(--serif); font-size: 24px; color: var(--ink); margin: 0; }
.empty p { margin: 0; }
.actions3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.actions3 .btn { height: 48px; font-size: 15px; padding: 0 8px; }
.search {
  display: flex; align-items: center; gap: 10px; height: 46px; padding: 0 14px;
  background: var(--card); border: 1px solid var(--line); border-radius: 14px; color: var(--muted);
}
.search input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 16px; color: var(--ink); }
.card-item {
  display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px;
  background: var(--card); border: 1px solid var(--line); border-radius: 14px;
}
.card-item__text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.card-item__front, .card-item__back {
  overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-item__front { font-family: var(--serif); font-size: 17px; }
.card-item__back { font-size: 14px; color: var(--muted); }
.chip { font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 999px; white-space: nowrap; }
.chip--new { background: var(--paper); color: var(--ink-2); }
.chip--today { background: var(--again-bg); color: var(--again-fg); }
.chip--soon { background: var(--good-bg); color: var(--good-fg); }
.chip--later { background: var(--easy-bg); color: var(--easy-fg); }

/* ---------- menu inferior ---------- */
.tabbar {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(20px + var(--safe-bottom)); z-index: 10;
  width: calc(100% - 32px); max-width: 528px; height: 68px; padding: 0 10px;
  background: var(--ink); border-radius: 24px; box-shadow: 0 18px 36px -16px rgba(30, 26, 22, 0.55);
  display: flex; align-items: center; justify-content: space-between;
}
.tabbar__item {
  min-width: 64px; height: 52px; border-radius: 16px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  color: var(--nav-muted); font-size: 11px; font-weight: 500;
}
.tabbar__item--active {
  flex-direction: row; gap: 8px; height: 48px; padding: 0 18px 0 14px;
  background: var(--card); color: var(--ink); font-size: 15px; font-weight: 600;
}
.tabbar__create {
  width: 52px; height: 52px; border-radius: 18px; background: var(--accent); color: var(--card);
  display: flex; align-items: center; justify-content: center;
}

/* ---------- folha inferior e formulários ---------- */
.sheet-backdrop {
  position: fixed; inset: 0; z-index: 20; background: rgba(30, 26, 22, 0.4);
  display: flex; align-items: flex-end; justify-content: center; animation: fade 0.2s ease;
}
.sheet {
  width: 100%; max-width: 560px; padding: 10px 24px calc(24px + var(--safe-bottom));
  background: var(--paper); border-radius: 24px 24px 0 0;
  display: flex; flex-direction: column; gap: 14px; animation: slide-up 0.28s cubic-bezier(0.2, 0.75, 0.25, 1);
}
.sheet__handle { width: 40px; height: 4px; border-radius: 2px; background: var(--line-2); margin: 0 auto 4px; }
.sheet__title { font-family: var(--serif); font-size: 22px; margin: 0; }
@keyframes fade { from { opacity: 0; } }
@keyframes slide-up { from { transform: translateY(100%); } }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 600; }
.input, .select {
  height: 48px; padding: 0 14px; font-size: 16px;
  border: 1px solid var(--line-2); border-radius: 12px; background: var(--card);
}
.input { width: 100%; }
.swatches { display: flex; gap: 10px; }
.swatch { width: 40px; height: 40px; padding: 0; border-radius: 50%; border: 3px solid transparent; cursor: pointer; }
.swatch[aria-pressed='true'] { border-color: var(--ink); }

/* ---------- toast e atualização ---------- */
.toast {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(104px + var(--safe-bottom)); z-index: 30;
  width: calc(100% - 32px); max-width: 528px; padding: 12px 16px;
  background: var(--ink); color: var(--card); border-radius: 14px;
  display: flex; align-items: center; gap: 12px; font-size: 15px; animation: fade 0.2s ease;
}
.toast span { flex: 1; }
.toast__action { border: none; background: none; padding: 6px; color: #f0b7a6; font-size: 15px; font-weight: 700; cursor: pointer; }
.update-banner {
  position: fixed; top: calc(8px + var(--safe-top)); left: 50%; transform: translateX(-50%); z-index: 40;
  border: none; border-radius: 999px; padding: 10px 16px; background: var(--accent); color: var(--card);
  font-size: 14px; font-weight: 600; cursor: pointer;
}

/* ---------- estudo ---------- */
.study__top { display: flex; align-items: center; gap: 6px; margin: 0 -10px; }
.progress { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.progress__meta { display: flex; justify-content: space-between; font-size: 12px; font-weight: 500; color: var(--muted); }
.progress__track { height: 6px; background: var(--line); border-radius: 4px; overflow: hidden; }
.progress__fill { height: 100%; background: var(--ink); border-radius: 4px; transition: width 0.3s ease; }
.flip { flex: 1; min-height: 0; perspective: 1400px; display: flex; }
.flip__drag { flex: 1; display: flex; touch-action: pan-y; }
.flip__inner { position: relative; flex: 1; transform-style: preserve-3d; }
.flip__face {
  position: absolute; inset: 0; padding: 20px 24px; overflow: hidden; text-align: left; cursor: pointer;
  border: 1px solid var(--line); border-radius: 22px; box-shadow: 0 18px 36px -22px rgba(60, 40, 20, 0.5);
  display: flex; flex-direction: column; gap: 12px;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
}
.flip__face:disabled { cursor: default; color: inherit; }
.flip__face--back { transform: rotateY(180deg); cursor: grab; }
.flip__text { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; }
.flip__text > span {
  margin: auto 0; font-family: var(--serif); font-size: 28px; line-height: 1.25;
  white-space: pre-wrap; overflow-wrap: anywhere;
}
.flip__hint { font-size: 13px; color: var(--muted); text-align: center; }
.flip__question {
  margin-top: 24px; font-size: 15px; color: var(--muted); white-space: pre-wrap; overflow-wrap: anywhere;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.flip__answer {
  flex: 1; min-height: 0; overflow-y: auto; font-family: var(--serif); font-size: 32px; line-height: 1.2;
  font-weight: 600; letter-spacing: -0.02em; white-space: pre-wrap; overflow-wrap: anywhere;
}
.flip__drag-hint { position: absolute; top: 18px; padding: 6px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; }
.flip__drag-hint--right { right: 18px; background: var(--good-bg); color: var(--good-fg); }
.flip__drag-hint--left { left: 18px; background: var(--again-bg); color: var(--again-fg); }
.study__bottom { display: flex; flex-direction: column; gap: 10px; }
.answer-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.answer-btn {
  height: 58px; border: none; border-radius: 14px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
}
.answer-btn:disabled { cursor: default; }
.answer-btn__label { font-size: 15px; font-weight: 600; }
.answer-btn__interval { font-size: 12px; }
.answer-btn--again { background: var(--again-bg); color: var(--again-fg); }
.answer-btn--hard { background: var(--hard-bg); color: var(--hard-fg); }
.answer-btn--good { background: var(--good-bg); color: var(--good-fg); }
.answer-btn--easy { background: var(--easy-bg); color: var(--easy-fg); }
.hint-line { margin: 0; min-height: 20px; font-size: 13px; color: var(--muted); text-align: center; }

/* ---------- fim da sessão ---------- */
.end__hero { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding-top: 40px; }
.end__hero p { margin: 0; max-width: 280px; color: var(--ink-2); }
.end__check {
  width: 72px; height: 72px; border-radius: 22px; background: var(--easy-bg); color: var(--easy-fg);
  display: flex; align-items: center; justify-content: center;
}
.stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.stat {
  padding: 16px 12px; background: var(--card); border: 1px solid var(--line); border-radius: 16px;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
}
.stat__value { font-family: var(--serif); font-size: 30px; font-weight: 600; }
.stat__label { font-size: 13px; color: var(--muted); }
.panel {
  padding: 18px; background: var(--card); border: 1px solid var(--line); border-radius: 16px;
  display: flex; flex-direction: column; gap: 14px;
}
.panel p { margin: 0; }
.week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; text-align: center; font-size: 11px; color: var(--muted); }
.week__day { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.week__dot { width: 30px; height: 30px; border-radius: 9px; border: 2px dashed #b8ae9e; }
.week__dot--done { background: var(--easy-fg); border: none; }
.week__dot--today { background: var(--ink); border: none; }

/* ---------- editor ---------- */
.editor__deck { align-self: flex-start; height: 40px; border-radius: 999px; font-size: 14px; font-weight: 600; }
.field-card {
  flex: 1; min-height: 170px; max-height: 260px; padding: 14px 18px;
  border: 1px solid var(--line); border-radius: 18px; display: flex; flex-direction: column; gap: 8px;
}
.field-card:focus-within { border: 2px solid var(--ink); padding: 13px 17px; }
.field-card textarea {
  flex: 1; padding: 0; border: none; outline: none; resize: none; background: transparent;
  font-family: var(--serif); font-size: 21px; line-height: 32px;
}
.success { margin: 0; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--easy-fg); }
.actions2 { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; }

/* ---------- importar ---------- */
.ai-card {
  display: flex; gap: 12px; align-items: center; padding: 14px 16px;
  background: var(--card); border: 1px solid var(--line); border-radius: 16px;
}
.ai-card p { margin: 2px 0 0; font-size: 13px; color: var(--ink-2); }
.segmented { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; background: #e9e2d5; border-radius: 12px; }
.segmented button { height: 40px; border: none; border-radius: 9px; background: transparent; font-size: 14px; font-weight: 500; color: var(--ink-2); cursor: pointer; }
.segmented button[aria-pressed='true'] { background: var(--card); font-weight: 600; color: var(--ink); }
.code {
  width: 100%; min-height: 120px; padding: 12px 14px; resize: vertical;
  background: var(--ink); color: #e9e2d5; border: none; border-radius: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 18px;
}
.error { margin: 0; padding: 12px 14px; border-radius: 12px; background: var(--again-bg); color: var(--again-fg); font-size: 14px; font-weight: 500; }
.preview-item {
  display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; cursor: pointer;
  background: var(--card); border: 1px solid var(--line); border-radius: 14px;
}
.preview-item--off { background: var(--paper-2); border-style: dashed; }
.preview-item input { width: 20px; height: 20px; margin: 2px 0 0; flex-shrink: 0; accent-color: var(--ink); }
.preview-item__text { display: flex; flex-direction: column; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.preview-item__warning { font-size: 13px; color: var(--again-fg); }
.sticky-bottom {
  position: sticky; bottom: 0; padding: 12px 0 calc(8px + var(--safe-bottom));
  background: linear-gradient(to bottom, rgba(243, 238, 228, 0), var(--paper) 30%);
}

/* ---------- ajustes ---------- */
.settings-group { padding: 4px 16px; background: var(--card); border: 1px solid var(--line); border-radius: 16px; }
.settings-group summary { padding: 14px 0; font-weight: 600; cursor: pointer; }
.settings-group__title { margin: 12px 0 4px; font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
.settings-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
.settings-row:last-child { border-bottom: none; }
.settings-row__label { font-size: 15px; font-weight: 600; }
.settings-row__hint { margin: 2px 0 0; font-size: 13px; color: var(--muted); }
.settings-action {
  width: 100%; min-height: 48px; padding: 0; display: flex; align-items: center;
  border: none; border-bottom: 1px solid var(--line); background: none; font-size: 15px; font-weight: 600; color: var(--ink); cursor: pointer;
}
.settings-action:last-child { border-bottom: none; }

/* ---------- onboarding ---------- */
.welcome { height: 100dvh; max-width: 560px; margin: 0 auto; padding: calc(16px + var(--safe-top)) 24px calc(24px + var(--safe-bottom)); display: flex; flex-direction: column; gap: 16px; }
.welcome__top { display: flex; justify-content: space-between; align-items: center; min-height: 44px; }
.welcome__dots { display: flex; gap: 6px; }
.welcome__dot { width: 8px; height: 8px; border-radius: 4px; background: var(--line-2); transition: width 0.25s ease, background 0.25s ease; }
.welcome__dot--active { width: 22px; background: var(--ink); }
.welcome__slide { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 16px; }
.welcome__visual { flex: 1; min-height: 200px; display: flex; }
.welcome__title { font-family: var(--serif); font-size: 32px; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
.welcome__text { margin: 0; font-size: 17px; line-height: 1.45; color: var(--ink-2); }
.welcome__note { margin: 0; font-size: 13px; color: var(--muted); }
.welcome__tips { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.welcome__tips li { display: flex; gap: 10px; align-items: center; font-size: 16px; }
.welcome__tips svg { color: var(--easy-fg); flex-shrink: 0; }
.choice { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.choice button { height: 52px; border-radius: 14px; border: 1px solid var(--line-2); background: var(--card); font-weight: 600; cursor: pointer; }
.choice button[aria-pressed='true'] { background: var(--ink); color: var(--card); border-color: var(--ink); }
.curve { width: 100%; height: 100%; }
```

- [ ] **Step 6: Criar `src/ui/storage.ts` e `src/ui/share.ts`**

`src/ui/storage.ts`:

```ts
function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const readLocal = (key: string): string | null => safe(() => localStorage.getItem(key), null);
export const writeLocal = (key: string, value: string): void => safe(() => localStorage.setItem(key, value), undefined);
export const readSession = (key: string): string | null => safe(() => sessionStorage.getItem(key), null);
export const writeSession = (key: string, value: string): void => safe(() => sessionStorage.setItem(key, value), undefined);

/** Pede ao navegador para não apagar os dados sozinho. Só pergunta uma vez. */
export async function requestPersistentStorage(): Promise<void> {
  if (readLocal('persistAsked')) return;
  writeLocal('persistAsked', '1');
  try {
    await navigator.storage?.persist?.();
  } catch {
    // navegador sem suporte: segue sem persistência garantida
  }
}
```

`src/ui/share.ts`:

```ts
export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

export async function shareJson(filename: string, json: string): Promise<ShareResult> {
  const file = new File([json], filename, { type: 'application/json' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // outra falha: cai no download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'baralho';
}
```

- [ ] **Step 7: Criar os componentes base**

`src/ui/components/Icon.tsx`:

```tsx
import type { ReactNode } from 'react';

export type IconName =
  | 'home' | 'decks' | 'settings' | 'plus' | 'close' | 'back' | 'undo' | 'more'
  | 'search' | 'download' | 'upload' | 'copy' | 'check' | 'flame' | 'arrow-right' | 'trash';

const PATHS: Record<IconName, ReactNode> = {
  home: <path d="M4 10.5L12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  decks: (<><rect x="4" y="8" width="16" height="12" rx="2.5" /><path d="M7 5h10" /></>),
  settings: (<><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  back: <path d="M15 6l-6 6 6 6" />,
  undo: (<><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>),
  more: (<><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>),
  search: (<><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>),
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  upload: <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />,
  copy: (<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></>),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  flame: <path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-4 3 0-2-1-4-3-6 0 4-3 6-3 11 0 4 3 8 7 8z" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
};

export function Icon({ name, size = 22, stroke = 2 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
```

`src/ui/components/TabBar.tsx`:

```tsx
import { Link, useLocation } from 'react-router';
import { Icon, type IconName } from './Icon';

interface Tab {
  to: string;
  label: string;
  icon: IconName;
  match: (path: string) => boolean;
}

const LEFT: Tab[] = [
  { to: '/', label: 'Hoje', icon: 'home', match: (p) => p === '/' },
  { to: '/decks', label: 'Baralhos', icon: 'decks', match: (p) => p.startsWith('/deck') },
];
const RIGHT: Tab = { to: '/settings', label: 'Ajustes', icon: 'settings', match: (p) => p.startsWith('/settings') };

export function TabBar({ createHref = '/card/new' }: { createHref?: string }) {
  const { pathname } = useLocation();
  const item = (t: Tab) => {
    const active = t.match(pathname);
    return (
      <Link key={t.to} to={t.to} className={active ? 'tabbar__item tabbar__item--active' : 'tabbar__item'}
        aria-current={active ? 'page' : undefined}>
        <Icon name={t.icon} />
        <span>{t.label}</span>
      </Link>
    );
  };
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {LEFT.map(item)}
      <Link to={createHref} className="tabbar__create" aria-label="Criar card">
        <Icon name="plus" size={24} stroke={2.4} />
      </Link>
      {item(RIGHT)}
    </nav>
  );
}
```

`src/ui/components/Toast.tsx`:

```tsx
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

export const UNDO_MS = 6000;

interface ToastInput {
  message: string;
  action?: { label: string; onAction: () => void };
}
interface ToastItem extends ToastInput {
  id: number;
}
type ShowToast = (t: ToastInput, ms?: number) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);

  const show = useCallback<ShowToast>((t, ms = 4000) => {
    window.clearTimeout(timer.current);
    const item = { ...t, id: ++counter.current };
    setToast(item);
    timer.current = window.setTimeout(() => setToast((cur) => (cur?.id === item.id ? null : cur)), ms);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.action && (
            <button type="button" className="toast__action"
              onClick={() => { toast.action?.onAction(); setToast(null); }}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = (): ShowToast => useContext(ToastContext);
```

`src/ui/components/BottomSheet.tsx`:

```tsx
import type { ReactNode } from 'react';

export function BottomSheet({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">{title}</h2>
        {children}
      </div>
    </div>
  );
}
```

`src/ui/components/ErrorScreen.tsx`:

```tsx
import { Component, useState, type ReactNode } from 'react';
import { exportBackupJson } from '../../data/importExport';
import { shareJson } from '../share';

export function ErrorScreen({ error }: { error: unknown }) {
  const [exportMsg, setExportMsg] = useState('');
  async function rescue() {
    try {
      await shareJson('lembra-resgate.json', await exportBackupJson());
      setExportMsg('Arquivo gerado.');
    } catch {
      setExportMsg('Não foi possível exportar os dados.');
    }
  }
  return (
    <main className="screen">
      <div className="empty">
        <p className="empty__title">Algo deu errado ao abrir teus dados</p>
        <p>Isso pode acontecer em modo anônimo ou com o armazenamento do celular cheio.</p>
        <p className="small">{error instanceof Error ? error.message : String(error)}</p>
        <button type="button" className="btn btn--primary btn--block" onClick={() => location.reload()}>Tentar novamente</button>
        <button type="button" className="btn btn--secondary btn--block" onClick={() => void rescue()}>Exportar o que for possível</button>
        {exportMsg && <p role="status">{exportMsg}</p>}
      </div>
    </main>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    return this.state.error !== null ? <ErrorScreen error={this.state.error} /> : this.props.children;
  }
}
```

- [ ] **Step 8: Criar as telas provisórias**

Cada arquivo abaixo tem este formato (troque o nome e o título); as tasks seguintes substituem o arquivo inteiro:

```tsx
// src/ui/screens/Today.tsx
import { TabBar } from '../components/TabBar';

export default function Today() {
  return (
    <main className="screen screen--tabs">
      <h1 className="title-serif page-title">Hoje</h1>
      <TabBar />
    </main>
  );
}
```

| Arquivo | Função | Título | Tem `<TabBar />` |
|---|---|---|---|
| `Today.tsx` | `Today` | Hoje | sim |
| `Decks.tsx` | `Decks` | Baralhos | sim |
| `Deck.tsx` | `DeckScreen` | Baralho | sim |
| `Settings.tsx` | `SettingsScreen` | Ajustes | sim |
| `CardEditor.tsx` | `CardEditor` | Novo card | não (use `className="screen"`) |
| `Study.tsx` | `Study` | Estudo | não |
| `SessionEnd.tsx` | `SessionEnd` | Fim da sessão | não |
| `Import.tsx` | `Import` | Importar cards | não |
| `Welcome.tsx` | `Welcome` | Bem-vindo | não |

- [ ] **Step 9: Criar `src/app/App.tsx` e substituir `src/main.tsx`**

`src/app/App.tsx`:

```tsx
import { createHashRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ErrorBoundary } from '../ui/components/ErrorScreen';
import { ToastProvider } from '../ui/components/Toast';
import CardEditor from '../ui/screens/CardEditor';
import DeckScreen from '../ui/screens/Deck';
import Decks from '../ui/screens/Decks';
import Import from '../ui/screens/Import';
import SessionEnd from '../ui/screens/SessionEnd';
import SettingsScreen from '../ui/screens/Settings';
import Study from '../ui/screens/Study';
import Today from '../ui/screens/Today';
import Welcome from '../ui/screens/Welcome';

const router = createHashRouter([
  { path: '/', element: <Today /> },
  { path: '/welcome', element: <Welcome /> },
  { path: '/decks', element: <Decks /> },
  { path: '/deck/:id', element: <DeckScreen /> },
  { path: '/study', element: <Study /> },
  { path: '/study/end', element: <SessionEnd /> },
  { path: '/card/new', element: <CardEditor /> },
  { path: '/card/:id/edit', element: <CardEditor /> },
  { path: '/import', element: <Import /> },
  { path: '/settings', element: <SettingsScreen /> },
]);

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  );
}
```

`src/main.tsx`:

```tsx
import '@fontsource-variable/fraunces';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import './ui/theme/tokens.css';
import './ui/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { db } from './data/db';
import { ErrorScreen } from './ui/components/ErrorScreen';

const root = createRoot(document.getElementById('root')!);

db.open()
  .then(() =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
  .catch((error: unknown) => root.render(<ErrorScreen error={error} />));
```

- [ ] **Step 10: Rodar e ver passar**

Run: `npm run build` → Expected: sem erros de tipo.
Run: `npx playwright test e2e/shell.spec.ts` → Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "feat: fundação da interface com tema, rotas, menu, toast e tela de erro"
```

---

### Task 14: Telas Hoje e Baralhos

**Files:**
- Create: `src/ui/components/DeckRow.tsx`, `src/ui/components/DeckSheet.tsx`, `e2e/today.spec.ts`
- Modify (substituir todo): `src/ui/screens/Today.tsx`, `src/ui/screens/Decks.tsx`

**Interfaces:**
- Consumes: `getTodayOverview`, `DeckOverview` (Task 11); `createDeck`, `updateDeck`, `DECK_COLORS` (Task 9); `exportBackupJson`, `markExported` (Task 12); `studyDayKey` (Task 2); `Icon`, `TabBar`, `BottomSheet`, `useToast`, `shareJson`, `readSession`, `writeSession` (Task 13).
- Produces:
  - `DeckRow({ overview }: { overview: DeckOverview })`
  - `DeckSheet({ open, onClose, deck?, onSaved? }: { open: boolean; onClose: () => void; deck?: Deck; onSaved?: (deck: Deck) => void })` — cria (botão "Criar baralho") ou edita (botão "Salvar").
  - Hoje abre a folha de novo baralho quando a URL tem `?newDeck=1` (usado pelo onboarding na Task 21).
  - Hoje redireciona para `/welcome` quando `onboarded` é falso (efeito ligado na Task 21; aqui já fica no código).

- [ ] **Step 1: Escrever o teste e2e**

`e2e/today.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { createCards, createDeck, openApp } from './helpers';

test('primeira abertura sem baralhos convida a criar um', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Crie teu primeiro baralho para começar.')).toBeVisible();
  await page.getByRole('button', { name: 'Criar baralho' }).click();
  const sheet = page.getByRole('dialog', { name: 'Novo baralho' });
  await sheet.getByLabel('Nome do baralho').fill('Inglês');
  await sheet.getByRole('button', { name: 'Criar baralho' }).click();
  await expect(page.getByRole('link', { name: /Inglês/ })).toBeVisible();
  await expect(page.getByText('Tudo em dia por hoje.')).toBeVisible();
});

test('mostra o total do dia e os baralhos', async ({ page }) => {
  await createDeck(page, 'Capitais');
  await createCards(page, 'Capitais', [['Capital da Austrália?', 'Canberra'], ['Capital do Canadá?', 'Ottawa']]);
  await openApp(page);
  await expect(page.locator('.hero__number')).toHaveText('2');
  await expect(page.getByText('0 revisões · 2 novos · cerca de 1 min')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Estudar agora' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Capitais/ })).toContainText('2 cards');
});

test('Baralhos lista e cria baralhos', async ({ page }) => {
  await createDeck(page, 'Química');
  await createDeck(page, 'Física');
  await expect(page.locator('.deck-row')).toHaveCount(2);
});
```

Run: `npx playwright test e2e/today.spec.ts` → Expected: FAIL.

- [ ] **Step 2: Criar `src/ui/components/DeckRow.tsx`**

```tsx
import { Link } from 'react-router';
import type { DeckOverview } from '../../data/overview';

export function DeckRow({ overview }: { overview: DeckOverview }) {
  const { deck, total, dueToday } = overview;
  return (
    <Link to={`/deck/${deck.id}`} className="deck-row">
      <span className="deck-row__bar" style={{ background: deck.color }} />
      <span className="deck-row__text">
        <span className="deck-row__name">{deck.name}</span>
        <span className="deck-row__meta">{total} {total === 1 ? 'card' : 'cards'}</span>
      </span>
      {dueToday > 0 ? (
        <span className="badge" aria-label={`${dueToday} para hoje`}>{dueToday}</span>
      ) : (
        <span className="deck-row__done">Em dia</span>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Criar `src/ui/components/DeckSheet.tsx`**

```tsx
import { useEffect, useState, type FormEvent } from 'react';
import { createDeck, DECK_COLORS, updateDeck } from '../../data/decks';
import type { Deck } from '../../domain/types';
import { BottomSheet } from './BottomSheet';

export function DeckSheet({ open, onClose, deck, onSaved }: {
  open: boolean;
  onClose: () => void;
  deck?: Deck;
  onSaved?: (deck: Deck) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DECK_COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(deck?.name ?? '');
      setColor(deck?.color ?? DECK_COLORS[0]);
    }
  }, [open, deck]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const saved = deck ? await updateDeck(deck.id, { name, color }) : await createDeck(name, color);
    onSaved?.(saved);
    onClose();
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={deck ? 'Editar baralho' : 'Novo baralho'}>
      <form className="stack" onSubmit={(e) => void submit(e)}>
        <label className="field">
          Nome do baralho
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80}
            placeholder="Ex.: Inglês — Phrasal verbs" />
        </label>
        <div className="field">
          <span>Cor</span>
          <div className="swatches">
            {DECK_COLORS.map((c) => (
              <button key={c} type="button" className="swatch" style={{ background: c }} aria-label={`Cor ${c}`}
                aria-pressed={c === color} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <button type="submit" className="btn btn--primary btn--block" disabled={!name.trim()}>
          {deck ? 'Salvar' : 'Criar baralho'}
        </button>
      </form>
    </BottomSheet>
  );
}
```

- [ ] **Step 4: Substituir `src/ui/screens/Today.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { exportBackupJson, markExported } from '../../data/importExport';
import { getTodayOverview } from '../../data/overview';
import { studyDayKey } from '../../domain/studyDay';
import { DeckRow } from '../components/DeckRow';
import { DeckSheet } from '../components/DeckSheet';
import { Icon } from '../components/Icon';
import { TabBar } from '../components/TabBar';
import { useToast } from '../components/Toast';
import { shareJson } from '../share';
import { readSession, writeSession } from '../storage';

function greeting(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatToday(d: Date): string {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Today() {
  const overview = useLiveQuery(() => getTodayOverview(Date.now()), []);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [sheet, setSheet] = useState(params.get('newDeck') === '1');
  const [backupDismissed, setBackupDismissed] = useState(() => readSession('backupDismissed') === '1');

  useEffect(() => {
    if (overview && !overview.onboarded) navigate('/welcome', { replace: true });
  }, [overview, navigate]);

  function closeSheet() {
    setSheet(false);
    if (params.has('newDeck')) setParams({}, { replace: true });
  }

  async function backupNow() {
    const now = Date.now();
    const result = await shareJson(`lembra-backup-${studyDayKey(now, 4)}.json`, await exportBackupJson());
    if (result !== 'cancelled') {
      await markExported(now);
      toast({ message: 'Backup exportado' });
    }
  }

  function dismissBackup() {
    writeSession('backupDismissed', '1');
    setBackupDismissed(true);
  }

  if (!overview) return <main className="screen screen--tabs" aria-busy="true" />;
  const { queue, decks, streak } = overview;
  const total = queue.cards.length;
  const now = new Date();

  return (
    <main className="screen screen--tabs">
      <header className="row-between">
        <div>
          <p className="today__date">{formatToday(now)}</p>
          <h1 className="title-serif today__greeting">{greeting(now.getHours())}</h1>
        </div>
        <span className="pill" aria-label={`Sequência de ${streak.days} dias`}>
          <Icon name="flame" size={16} />
          {streak.days} {streak.days === 1 ? 'dia' : 'dias'}
        </span>
      </header>

      {overview.backupDue && !backupDismissed && (
        <div className="notice">
          <p>Faz tempo que tu não exportas um backup.</p>
          <button type="button" className="link-btn" onClick={() => void backupNow()}>Exportar</button>
          <button type="button" className="icon-btn" aria-label="Dispensar aviso" onClick={dismissBackup}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      <section className="hero-stack">
        <div className="hero ruled">
          <span className="label">Para hoje</span>
          {total > 0 ? (
            <>
              <div className="hero__count">
                <span className="hero__number">{total}</span>
                <span className="hero__unit">{total === 1 ? 'card' : 'cards'}</span>
              </div>
              <p className="hero__meta">
                {queue.reviewCount} revisões · {queue.newCount} novos · cerca de {queue.estimatedMinutes} min
              </p>
              <Link to="/study" className="btn btn--primary btn--block">
                Estudar agora <Icon name="arrow-right" size={18} />
              </Link>
            </>
          ) : decks.length === 0 ? (
            <>
              <p className="hero__empty">Crie teu primeiro baralho para começar.</p>
              <button type="button" className="btn btn--primary btn--block" onClick={() => setSheet(true)}>
                Criar baralho
              </button>
            </>
          ) : (
            <>
              <p className="hero__empty">Tudo em dia por hoje.</p>
              <Link to="/card/new" className="btn btn--secondary btn--block">Criar cards</Link>
            </>
          )}
        </div>
      </section>

      {decks.length > 0 && (
        <>
          <div className="row-between">
            <h2 className="title-serif section-title">Baralhos</h2>
            <button type="button" className="link-btn" onClick={() => setSheet(true)}>+ Novo baralho</button>
          </div>
          <div className="list">
            {decks.map((d) => <DeckRow key={d.deck.id} overview={d} />)}
          </div>
        </>
      )}

      <DeckSheet open={sheet} onClose={closeSheet} />
      <TabBar />
    </main>
  );
}
```

- [ ] **Step 5: Substituir `src/ui/screens/Decks.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getTodayOverview } from '../../data/overview';
import { DeckRow } from '../components/DeckRow';
import { DeckSheet } from '../components/DeckSheet';
import { TabBar } from '../components/TabBar';

export default function Decks() {
  const overview = useLiveQuery(() => getTodayOverview(Date.now()), []);
  const [sheet, setSheet] = useState(false);

  return (
    <main className="screen screen--tabs">
      <div className="row-between">
        <h1 className="title-serif page-title">Baralhos</h1>
        <button type="button" className="link-btn" onClick={() => setSheet(true)}>+ Novo baralho</button>
      </div>
      {overview &&
        (overview.decks.length === 0 ? (
          <div className="empty">
            <p className="empty__title">Nenhum baralho ainda</p>
            <p>Um baralho junta os cards de um mesmo assunto.</p>
          </div>
        ) : (
          <div className="list">
            {overview.decks.map((d) => <DeckRow key={d.deck.id} overview={d} />)}
          </div>
        ))}
      <DeckSheet open={sheet} onClose={() => setSheet(false)} />
      <TabBar />
    </main>
  );
}
```

- [ ] **Step 6: Rodar e ver passar**

O segundo teste depende do editor de cards (Task 15). Nesta task, rode só o primeiro e o terceiro:

Run: `npx playwright test e2e/today.spec.ts -g "primeira abertura|Baralhos lista"` → Expected: PASS.

Até a Task 21, `onboarded` é sempre falso e a tela Welcome é provisória, sem botão "Pular". Para os testes passarem já, deixe o redirecionamento desligado nesta task trocando a condição por `if (false && overview && !overview.onboarded)`, e **reative-o na Task 21** (lá está escrito).

- [ ] **Step 7: Commit**

```bash
git add src/ui e2e/today.spec.ts
git commit -m "feat: telas Hoje e Baralhos com criação de baralho"
```

---

### Task 15: Criar e editar card

**Files:**
- Modify (substituir todo): `src/ui/screens/CardEditor.tsx`
- Create: `e2e/editor.spec.ts`

**Interfaces:**
- Consumes: `listDecks` (Task 9), `createCard`, `updateCard`, `getCard`, `deleteCard`, `restoreCard` (Task 9); `DeckSheet` (Task 14); `Icon`, `useToast`, `UNDO_MS`, `readLocal`, `writeLocal`, `requestPersistentStorage` (Task 13).
- Produces: rotas `/card/new?deck=ID` (baralho pré-escolhido; senão o último usado, guardado em `localStorage['lastDeckId']`, senão o primeiro) e `/card/:id/edit`.

- [ ] **Step 1: Escrever o teste e2e**

`e2e/editor.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { createDeck } from './helpers';

test('cria vários cards seguidos com Salvar e próximo', async ({ page }) => {
  await createDeck(page, 'Inglês');
  await page.goto('/#/card/new');
  await expect(page.getByLabel('Baralho')).toHaveValue(/.+/);
  await page.getByLabel('Frente').fill('Put off');
  await page.getByLabel('Verso').fill('Adiar');
  await page.getByRole('button', { name: 'Salvar e próximo' }).click();
  await expect(page.getByLabel('Frente')).toHaveValue('');
  await expect(page.getByLabel('Frente')).toBeFocused();
  await page.getByLabel('Frente').fill('Give up');
  await page.getByLabel('Verso').fill('Desistir');
  await page.getByRole('button', { name: 'Salvar e próximo' }).click();
  await expect(page.getByText('2 cards criados agora')).toBeVisible();
});

test('frente ou verso só com espaços não salva', async ({ page }) => {
  await createDeck(page, 'Inglês');
  await page.goto('/#/card/new');
  await page.getByLabel('Frente').fill('   ');
  await page.getByLabel('Verso').fill('Algo');
  await expect(page.getByRole('button', { name: 'Salvar e próximo' })).toBeDisabled();
});

test('sem baralhos, pede para criar um primeiro', async ({ page }) => {
  await page.goto('/#/card/new');
  await expect(page.getByText('Crie um baralho primeiro')).toBeVisible();
});
```

Run: `npx playwright test e2e/editor.spec.ts` → Expected: FAIL.

- [ ] **Step 2: Substituir `src/ui/screens/CardEditor.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { createCard, deleteCard, getCard, restoreCard, updateCard } from '../../data/cards';
import { listDecks } from '../../data/decks';
import { DeckSheet } from '../components/DeckSheet';
import { Icon } from '../components/Icon';
import { UNDO_MS, useToast } from '../components/Toast';
import { readLocal, requestPersistentStorage, writeLocal } from '../storage';

export default function CardEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const decks = useLiveQuery(() => listDecks(), []);
  const existing = useLiveQuery(() => (id ? getCard(id) : Promise.resolve(null)), [id]);

  const [deckId, setDeckId] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [created, setCreated] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const loaded = useRef(false);
  const frontRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (existing && !loaded.current) {
      loaded.current = true;
      setDeckId(existing.deckId);
      setFront(existing.front);
      setBack(existing.back);
    }
  }, [existing]);

  useEffect(() => {
    if (id || !decks || deckId) return;
    const preferred = params.get('deck') ?? readLocal('lastDeckId');
    setDeckId(decks.find((d) => d.id === preferred)?.id ?? decks[0]?.id ?? '');
  }, [decks, id, deckId, params]);

  const canSave = deckId !== '' && front.trim() !== '' && back.trim() !== '' && !saving;

  async function saveNew() {
    if (!canSave) return;
    setSaving(true);
    try {
      await createCard(deckId, front, back);
      writeLocal('lastDeckId', deckId);
      void requestPersistentStorage();
      setFront('');
      setBack('');
      setCreated((n) => n + 1);
      frontRef.current?.focus();
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (!canSave || !id) return;
    setSaving(true);
    try {
      await updateCard(id, { front, back, deckId });
      navigate(-1);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    await deleteCard(id);
    toast({ message: 'Card apagado', action: { label: 'Desfazer', onAction: () => void restoreCard(id) } }, UNDO_MS);
    navigate(-1);
  }

  if (decks && decks.length === 0) {
    return (
      <main className="screen">
        <div className="topbar">
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => navigate(-1)}>
            <Icon name="close" />
          </button>
        </div>
        <div className="empty">
          <p className="empty__title">Crie um baralho primeiro</p>
          <p>Os cards ficam guardados dentro de baralhos.</p>
          <button type="button" className="btn btn--primary" onClick={() => setSheet(true)}>Criar baralho</button>
        </div>
        <DeckSheet open={sheet} onClose={() => setSheet(false)} onSaved={(d) => setDeckId(d.id)} />
      </main>
    );
  }

  const editing = Boolean(id);

  return (
    <main className="screen">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="Fechar" onClick={() => navigate(-1)}>
          <Icon name="close" />
        </button>
        <h1 className="topbar__title">{editing ? 'Editar card' : 'Novo card'}</h1>
        {editing ? (
          <span className="icon-btn" aria-hidden="true" />
        ) : (
          <Link to={`/import${deckId ? `?deck=${deckId}` : ''}`} className="link-btn" style={{ padding: '0 10px' }}>
            Importar
          </Link>
        )}
      </div>

      <select className="select editor__deck" aria-label="Baralho" value={deckId} onChange={(e) => setDeckId(e.target.value)}>
        {decks?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <label className="field-card ruled ruled--tight">
        <span className="label">Frente</span>
        <textarea ref={frontRef} value={front} onChange={(e) => setFront(e.target.value)} autoFocus
          placeholder="Pergunta…" />
      </label>

      <label className="field-card ruled ruled--tight">
        <span className="label">Verso</span>
        <textarea value={back} onChange={(e) => setBack(e.target.value)} placeholder="Resposta…" />
      </label>

      {created > 0 && (
        <p className="success">
          <Icon name="check" size={16} stroke={2.4} />
          {created} {created === 1 ? 'card criado agora' : 'cards criados agora'}
        </p>
      )}

      <div className="spacer" />

      {editing ? (
        <div className="actions2">
          <button type="button" className="btn btn--danger" onClick={() => void remove()}>
            <Icon name="trash" size={18} /> Apagar card
          </button>
          <button type="button" className="btn btn--primary" disabled={!canSave} onClick={() => void saveEdit()}>
            Salvar
          </button>
        </div>
      ) : (
        <div className="actions2">
          <Link to={deckId ? `/deck/${deckId}` : '/decks'} className="btn btn--secondary">Concluir</Link>
          <button type="button" className="btn btn--primary" disabled={!canSave} onClick={() => void saveNew()}>
            Salvar e próximo
          </button>
        </div>
      )}
    </main>
  );
}
```

Nota: o nome acessível do botão de apagar é "Apagar card" (o ícone é `aria-hidden`).

- [ ] **Step 3: Rodar e ver passar**

Run: `npx playwright test e2e/editor.spec.ts e2e/today.spec.ts` → Expected: PASS (agora o segundo teste de `today.spec.ts` também passa).

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/CardEditor.tsx e2e/editor.spec.ts
git commit -m "feat: criação rápida e edição de cards"
```

---

### Task 16: Tela do baralho (lista, busca, exportar, apagar)

**Files:**
- Modify (substituir todo): `src/ui/screens/Deck.tsx`
- Create: `e2e/deck.spec.ts`

**Interfaces:**
- Consumes: `getDeck`, `deleteDeck`, `restoreDeck` (Task 9); `listDeckCards` (Task 9); `getSettings` (Task 10); `exportDeckJson` (Task 12); `isNew`, `formatInterval` (Task 3); `studyDayEnd` (Task 2); `DeckSheet` (Task 14); `BottomSheet`, `Icon`, `TabBar`, `useToast`, `UNDO_MS`, `shareJson`, `copyText`, `slugify` (Task 13).
- Produces: rota `/deck/:id`. O arquivo exportado se chama `<slug do nome>.json` (ex.: "Inglês" → `ingles.json`).

- [ ] **Step 1: Escrever o teste e2e**

`e2e/deck.spec.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createCards, createDeck } from './helpers';

test.beforeEach(async ({ page }) => {
  // força o caminho de download (sem menu de compartilhar) para o teste conseguir ler o arquivo
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true });
  });
  await createDeck(page, 'Inglês');
  await createCards(page, 'Inglês', [['Put off', 'Adiar'], ['Give up', 'Desistir'], ['Run out of', 'Ficar sem']]);
  await page.goto('/#/decks');
  await page.getByRole('link', { name: /Inglês/ }).click();
});

test('lista, busca e mostra o estado dos cards', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Inglês' })).toBeVisible();
  await expect(page.getByText('3 cards · 0 para hoje · 3 novos')).toBeVisible();
  await expect(page.locator('.card-item')).toHaveCount(3);
  await page.getByLabel('Buscar nos cards').fill('desis');
  await expect(page.locator('.card-item')).toHaveCount(1);
  await expect(page.locator('.card-item').first()).toContainText('novo');
});

test('apagar card tem desfazer', async ({ page }) => {
  await page.getByText('Put off').click();
  await expect(page.getByRole('heading', { name: 'Editar card' })).toBeVisible();
  await page.getByRole('button', { name: 'Apagar card' }).click();
  await expect(page.locator('.card-item')).toHaveCount(2);
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.locator('.card-item')).toHaveCount(3);
});

test('exporta o baralho em JSON', async ({ page }) => {
  await page.getByRole('button', { name: 'Exportar' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Compartilhar só os cards' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('ingles.json');
  const json = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(json.deck).toBe('Inglês');
  expect(json.cards.map((c: { front: string }) => c.front)).toEqual(['Put off', 'Give up', 'Run out of']);
});

test('apagar baralho tem desfazer', async ({ page }) => {
  await page.getByRole('button', { name: 'Opções do baralho' }).click();
  await page.getByRole('button', { name: 'Apagar baralho' }).click();
  await expect(page).toHaveURL(/#\/decks$/);
  await expect(page.locator('.deck-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.locator('.deck-row')).toHaveCount(1);
});
```

Run: `npx playwright test e2e/deck.spec.ts` → Expected: FAIL.

- [ ] **Step 2: Substituir `src/ui/screens/Deck.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { listDeckCards } from '../../data/cards';
import { deleteDeck, getDeck, restoreDeck } from '../../data/decks';
import { exportDeckJson } from '../../data/importExport';
import { getSettings } from '../../data/settings';
import { formatInterval, isNew } from '../../domain/scheduler';
import { studyDayEnd } from '../../domain/studyDay';
import type { Card } from '../../domain/types';
import { BottomSheet } from '../components/BottomSheet';
import { DeckSheet } from '../components/DeckSheet';
import { Icon } from '../components/Icon';
import { TabBar } from '../components/TabBar';
import { UNDO_MS, useToast } from '../components/Toast';
import { copyText, shareJson, slugify } from '../share';

const DAY = 86_400_000;

function chipFor(card: Card, now: number, endOfDay: number): { label: string; tone: string } {
  if (isNew(card.fsrs)) return { label: 'novo', tone: 'new' };
  if (card.fsrs.due < endOfDay) return { label: 'hoje', tone: 'today' };
  const wait = card.fsrs.due - now;
  return { label: `em ${formatInterval(wait)}`, tone: wait > 14 * DAY ? 'later' : 'soon' };
}

export default function DeckScreen() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const deck = useLiveQuery(() => getDeck(id), [id]);
  const cards = useLiveQuery(() => listDeckCards(id), [id]);
  const settings = useLiveQuery(() => getSettings(), []);
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  if (deck === undefined || !cards || !settings) return <main className="screen screen--tabs" aria-busy="true" />;

  if (deck === null) {
    return (
      <main className="screen screen--tabs">
        <div className="empty">
          <p className="empty__title">Baralho não encontrado</p>
          <Link to="/decks" className="btn btn--secondary">Ver baralhos</Link>
        </div>
        <TabBar />
      </main>
    );
  }

  const now = Date.now();
  const end = studyDayEnd(now, settings.dayStartHour);
  const dueCount = cards.filter((c) => !isNew(c.fsrs) && c.fsrs.due < end).length;
  const newCount = cards.filter((c) => isNew(c.fsrs)).length;
  const needle = query.trim().toLowerCase();
  const shown = needle ? cards.filter((c) => `${c.front} ${c.back}`.toLowerCase().includes(needle)) : cards;

  async function exportAs(mode: 'cards' | 'progress' | 'copy') {
    if (!deck) return;
    const json = await exportDeckJson(deck.id, mode === 'progress');
    setExportOpen(false);
    if (mode === 'copy') {
      toast({ message: (await copyText(json)) ? 'JSON copiado' : 'Não consegui copiar' });
      return;
    }
    const suffix = mode === 'progress' ? '-progresso' : '';
    await shareJson(`${slugify(deck.name)}${suffix}.json`, json);
  }

  async function removeDeck() {
    if (!deck) return;
    const deckId = deck.id;
    await deleteDeck(deckId);
    setMenuOpen(false);
    toast({ message: 'Baralho apagado', action: { label: 'Desfazer', onAction: () => void restoreDeck(deckId) } }, UNDO_MS);
    navigate('/decks');
  }

  return (
    <main className="screen screen--tabs">
      <div className="topbar">
        <Link to="/decks" className="icon-btn" aria-label="Voltar"><Icon name="back" /></Link>
        <button type="button" className="icon-btn" aria-label="Opções do baralho" onClick={() => setMenuOpen(true)}>
          <Icon name="more" />
        </button>
      </div>

      <div className="stack" style={{ gap: 4 }}>
        <h1 className="title-serif page-title">{deck.name}</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          {cards.length} {cards.length === 1 ? 'card' : 'cards'} · {dueCount} para hoje · {newCount} novos
        </p>
      </div>

      <div className="actions3">
        <Link to={`/study?deck=${deck.id}`} className="btn btn--primary">Estudar</Link>
        <Link to={`/import?deck=${deck.id}`} className="btn btn--secondary"><Icon name="download" size={16} /> Importar</Link>
        <button type="button" className="btn btn--secondary" onClick={() => setExportOpen(true)}>
          <Icon name="upload" size={16} /> Exportar
        </button>
      </div>

      {cards.length > 0 && (
        <label className="search">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Buscar nos cards" aria-label="Buscar nos cards" value={query}
            onChange={(e) => setQuery(e.target.value)} />
        </label>
      )}

      {cards.length === 0 ? (
        <div className="empty">
          <p className="empty__title">Nenhum card ainda</p>
          <Link to={`/card/new?deck=${deck.id}`} className="btn btn--primary">Criar card</Link>
        </div>
      ) : (
        <div className="list">
          {shown.map((c) => {
            const chip = chipFor(c, now, end);
            return (
              <Link key={c.id} to={`/card/${c.id}/edit`} className="card-item">
                <span className="card-item__text">
                  <span className="card-item__front">{c.front}</span>
                  <span className="card-item__back">{c.back}</span>
                </span>
                <span className={`chip chip--${chip.tone}`}>{chip.label}</span>
              </Link>
            );
          })}
          {shown.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>Nada encontrado.</p>}
        </div>
      )}

      <BottomSheet open={exportOpen} onClose={() => setExportOpen(false)} title="Exportar baralho">
        <div className="stack">
          <button type="button" className="btn btn--secondary btn--block" onClick={() => void exportAs('cards')}>Compartilhar só os cards</button>
          <button type="button" className="btn btn--secondary btn--block" onClick={() => void exportAs('progress')}>Compartilhar com progresso</button>
          <button type="button" className="btn btn--secondary btn--block" onClick={() => void exportAs('copy')}>
            <Icon name="copy" size={18} /> Copiar JSON
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={deck.name}>
        <div className="stack">
          <button type="button" className="btn btn--secondary btn--block" onClick={() => { setMenuOpen(false); setRenameOpen(true); }}>
            Renomear baralho
          </button>
          <button type="button" className="btn btn--danger btn--block" onClick={() => void removeDeck()}>Apagar baralho</button>
        </div>
      </BottomSheet>

      <DeckSheet open={renameOpen} onClose={() => setRenameOpen(false)} deck={deck} />
      <TabBar createHref={`/card/new?deck=${deck.id}`} />
    </main>
  );
}
```

- [ ] **Step 3: Rodar e ver passar**

Run: `npx playwright test e2e/deck.spec.ts` → Expected: PASS (4 testes).

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/Deck.tsx e2e/deck.spec.ts
git commit -m "feat: tela do baralho com busca, exportação e apagar com desfazer"
```

---

### Task 17: Estudo (card que gira, respostas, gestos, desfazer)

**Files:**
- Create: `src/ui/components/FlipCard.tsx`, `src/ui/components/AnswerButtons.tsx`, `e2e/study.spec.ts`
- Modify (substituir todo): `src/ui/screens/Study.tsx`

**Interfaces:**
- Consumes: `getStudyQueue`, `markDayCompleted` (Task 11); `answerCard`, `undoAnswer` (Task 10); `getSettings` (Task 10); `getDeck` (Task 9); `startSession`, `currentCard`, `remaining`, `applyAnswer`, `applyUndo`, `SessionState` (Task 5); `createScheduler`, `formatInterval` (Task 3); `studyDayEnd` (Task 2); `Icon` (Task 13).
- Produces:
  - `FlipCard({ front, back, flipped, onFlip, onSwipe }: { front: string; back: string; flipped: boolean; onFlip: () => void; onSwipe: (dir: 'left' | 'right') => void })` — também usado no onboarding (Task 21).
  - `AnswerButtons({ intervals, onAnswer, disabled }: { intervals?: Record<Rating, string>; onAnswer: (r: Rating) => void; disabled?: boolean })` — sem `intervals`, mostra só os rótulos (onboarding).
  - Rota `/study?deck=ID&extra=N`. Ao terminar, navega para `/study/end` com `state: { answered, again, startedAt }`.
  - Gestos: arrastar o verso > 100 px para a direita = Bom (3); para a esquerda = Errei (1).

- [ ] **Step 1: Escrever o teste e2e**

`e2e/study.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';
import { createCards, createDeck, openApp } from './helpers';

async function setup(page: Page, cards: [string, string][]) {
  await createDeck(page, 'Capitais');
  await createCards(page, 'Capitais', cards);
  await openApp(page);
  await page.getByRole('link', { name: 'Estudar agora' }).click();
}

const TWO: [string, string][] = [['Capital da Austrália?', 'Canberra'], ['Capital do Canadá?', 'Ottawa']];

test('vira o card, responde e termina a sessão', async ({ page }) => {
  await setup(page, TWO);
  await expect(page.getByText('1 / 2')).toBeVisible();
  await expect(page.getByText('Capital da Austrália?').first()).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await expect(page.getByText('Canberra')).toBeVisible();
  await page.getByRole('button', { name: /^Fácil/ }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).click();
  await expect(page).toHaveURL(/#\/study\/end/);
});

test('Errei faz o card voltar na mesma sessão', async ({ page }) => {
  await setup(page, [TWO[0]]);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Errei/ }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await expect(page.getByText('Capital da Austrália?').first()).toBeVisible();
});

test('desfazer volta ao card anterior já virado', async ({ page }) => {
  await setup(page, TWO);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).click();
  await expect(page.getByText('2 / 2')).toBeVisible();
  await page.getByRole('button', { name: 'Desfazer última resposta' }).click();
  await expect(page.getByText('1 / 2')).toBeVisible();
  await expect(page.getByText('Canberra')).toBeVisible();
});

test('arrastar para a direita responde Bom', async ({ page }) => {
  await setup(page, TWO);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  const box = (await page.locator('.flip__drag').boundingBox())!;
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 220, y, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByText('2 / 2')).toBeVisible();
});

test('toque duplo num botão registra uma resposta só', async ({ page }) => {
  await setup(page, TWO);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).dblclick();
  await expect(page.getByText('2 / 2')).toBeVisible();
});

test('texto muito longo rola dentro do card e o botão continua visível', async ({ page }) => {
  await setup(page, [['palavra '.repeat(400), 'fim']]);
  await expect(page.getByRole('button', { name: 'Mostrar resposta' })).toBeInViewport();
});

test('sem nada para estudar mostra estado vazio', async ({ page }) => {
  await page.goto('/#/study');
  await expect(page.getByText('Nada para estudar agora')).toBeVisible();
});
```

Run: `npx playwright test e2e/study.spec.ts` → Expected: FAIL.

- [ ] **Step 2: Criar `src/ui/components/FlipCard.tsx`**

```tsx
import { motion, useMotionValue, useTransform } from 'motion/react';
import { useState } from 'react';

export const SWIPE_THRESHOLD = 100;

export function FlipCard({ front, back, flipped, onFlip, onSwipe }: {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (dir: 'left' | 'right') => void;
}) {
  const x = useMotionValue(0);
  const tilt = useTransform(x, [-200, 200], [-8, 8]);
  const [dragHint, setDragHint] = useState<'left' | 'right' | null>(null);

  return (
    <div className="flip">
      <motion.div
        className="flip__drag"
        style={{ x, rotate: tilt }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        drag={flipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDrag={(_, info) => setDragHint(info.offset.x > 40 ? 'right' : info.offset.x < -40 ? 'left' : null)}
        onDragEnd={(_, info) => {
          setDragHint(null);
          if (info.offset.x > SWIPE_THRESHOLD) onSwipe('right');
          else if (info.offset.x < -SWIPE_THRESHOLD) onSwipe('left');
        }}
      >
        <motion.div
          className="flip__inner"
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.75, 0.25, 1] }}
        >
          <button type="button" className="flip__face ruled" onClick={onFlip} disabled={flipped} tabIndex={flipped ? -1 : 0}>
            <span className="label">Pergunta</span>
            <span className="flip__text"><span>{front}</span></span>
            <span className="flip__hint">Toque para virar</span>
          </button>
          <div className="flip__face flip__face--back ruled" aria-hidden={!flipped}>
            <span className="label">Resposta</span>
            <span className="flip__question">{front}</span>
            <span className="flip__answer">{back}</span>
            {dragHint && (
              <span className={`flip__drag-hint flip__drag-hint--${dragHint}`}>{dragHint === 'right' ? 'Bom' : 'Errei'}</span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 3: Criar `src/ui/components/AnswerButtons.tsx`**

```tsx
import type { Rating } from '../../domain/types';

const OPTIONS: { rating: Rating; label: string; tone: string }[] = [
  { rating: 1, label: 'Errei', tone: 'again' },
  { rating: 2, label: 'Difícil', tone: 'hard' },
  { rating: 3, label: 'Bom', tone: 'good' },
  { rating: 4, label: 'Fácil', tone: 'easy' },
];

export function AnswerButtons({ intervals, onAnswer, disabled = false }: {
  intervals?: Record<Rating, string>;
  onAnswer: (rating: Rating) => void;
  disabled?: boolean;
}) {
  return (
    <div className="answer-grid">
      {OPTIONS.map((o) => (
        <button key={o.rating} type="button" className={`answer-btn answer-btn--${o.tone}`} disabled={disabled}
          onClick={() => onAnswer(o.rating)}>
          <span className="answer-btn__label">{o.label}</span>
          {intervals && <span className="answer-btn__interval">{intervals[o.rating]}</span>}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Substituir `src/ui/screens/Study.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { getDeck } from '../../data/decks';
import { getStudyQueue, markDayCompleted } from '../../data/overview';
import { answerCard, undoAnswer } from '../../data/reviews';
import { getSettings } from '../../data/settings';
import { createScheduler, formatInterval } from '../../domain/scheduler';
import { applyAnswer, applyUndo, currentCard, remaining, startSession, type SessionState } from '../../domain/session';
import { studyDayEnd } from '../../domain/studyDay';
import type { Rating, Settings } from '../../domain/types';
import { AnswerButtons } from '../components/AnswerButtons';
import { FlipCard } from '../components/FlipCard';
import { Icon } from '../components/Icon';

interface UndoEntry {
  logId: string;
  rating: Rating;
}

export default function Study() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const deckId = params.get('deck') ?? undefined;
  const extraNew = Number(params.get('extra') ?? 0) || 0;
  const deck = useLiveQuery(() => (deckId ? getDeck(deckId) : Promise.resolve(null)), [deckId]);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [s, q] = await Promise.all([getSettings(), getStudyQueue(Date.now(), { deckId, extraNew })]);
      if (!alive) return;
      setSettings(s);
      setSession(startSession(q.cards, Date.now()));
    })();
    return () => {
      alive = false;
    };
  }, [deckId, extraNew]);

  // cards de aprendizagem ficam prontos com o tempo
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, []);

  const scheduler = useMemo(() => (settings ? createScheduler(settings.desiredRetention) : null), [settings]);
  const card = session ? currentCard(session, now) : undefined;

  const intervals = useMemo(() => {
    if (!card || !scheduler) return undefined;
    const t = Date.now();
    const p = scheduler.preview(card.fsrs, t);
    return {
      1: formatInterval(p[1] - t),
      2: formatInterval(p[2] - t),
      3: formatInterval(p[3] - t),
      4: formatInterval(p[4] - t),
    } as Record<Rating, string>;
  }, [card, scheduler]);

  async function finish(s: SessionState) {
    if (remaining(s) === 0) {
      const rest = await getStudyQueue(Date.now());
      if (rest.cards.length === 0) await markDayCompleted(Date.now());
    }
    if (s.answered === 0) {
      navigate('/', { replace: true });
      return;
    }
    navigate('/study/end', { replace: true, state: { answered: s.answered, again: s.again, startedAt: s.startedAt } });
  }

  async function answer(rating: Rating) {
    if (!card || !session || !scheduler || !settings || busy.current) return;
    busy.current = true;
    try {
      const t = Date.now();
      const { card: updated, log } = await answerCard(card.id, rating, scheduler, t);
      const next = applyAnswer(session, updated, rating, studyDayEnd(t, settings.dayStartHour));
      setUndoStack((u) => [...u, { logId: log.id, rating }]);
      setFlipped(false);
      setNow(t);
      setSession(next);
      if (remaining(next) === 0) await finish(next);
    } finally {
      busy.current = false;
    }
  }

  async function undo() {
    const last = undoStack.at(-1);
    if (!last || !session || busy.current) return;
    busy.current = true;
    try {
      const restored = await undoAnswer(last.logId);
      setUndoStack((u) => u.slice(0, -1));
      setSession(applyUndo(session, restored, last.rating));
      setFlipped(true);
    } finally {
      busy.current = false;
    }
  }

  if (!session) return <main className="screen screen--focus" aria-busy="true" />;

  if (!card) {
    return (
      <main className="screen screen--focus">
        <div className="empty" style={{ margin: 'auto 0' }}>
          <p className="empty__title">Nada para estudar agora</p>
          <p>Volte mais tarde ou crie novos cards.</p>
          <Link to="/" className="btn btn--primary">Voltar ao início</Link>
        </div>
      </main>
    );
  }

  const total = session.answered + remaining(session);
  const position = session.answered + 1;

  return (
    <main className="screen screen--focus">
      <div className="study__top">
        <button type="button" className="icon-btn" aria-label="Encerrar sessão" onClick={() => void finish(session)}>
          <Icon name="close" />
        </button>
        <div className="progress">
          <div className="progress__meta">
            <span>{deck?.name ?? 'Todos os baralhos'}</span>
            <span>{position} / {total}</span>
          </div>
          <div className="progress__track">
            <div className="progress__fill" style={{ width: `${Math.round((session.answered / total) * 100)}%` }} />
          </div>
        </div>
        <button type="button" className="icon-btn" aria-label="Desfazer última resposta" disabled={undoStack.length === 0}
          onClick={() => void undo()}>
          <Icon name="undo" />
        </button>
      </div>

      <FlipCard
        key={`${card.id}:${card.fsrs.reps}`}
        front={card.front}
        back={card.back}
        flipped={flipped}
        onFlip={() => setFlipped(true)}
        onSwipe={(dir) => void answer(dir === 'right' ? 3 : 1)}
      />

      <div className="study__bottom">
        {flipped ? (
          <>
            <AnswerButtons intervals={intervals} onAnswer={(r) => void answer(r)} />
            <p className="hint-line">ou arraste o card: ← Errei · Bom →</p>
          </>
        ) : (
          <>
            <button type="button" className="btn btn--primary btn--block" style={{ height: 58 }} onClick={() => setFlipped(true)}>
              Mostrar resposta
            </button>
            <p className="hint-line">ou toque no card</p>
          </>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx playwright test e2e/study.spec.ts` → Expected: PASS (7 testes). Se o teste de arrastar falhar só no ambiente de teste (o Motion não recebe os eventos do mouse emulado), troque os passos do mouse por `page.locator('.flip__drag').dragTo(page.locator('.flip__drag'), { targetPosition: { x: box.width + 200, y: box.height / 2 } })` e rode de novo; se ainda falhar, teste o gesto no celular (Task 22) e registre no commit.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/FlipCard.tsx src/ui/components/AnswerButtons.tsx src/ui/screens/Study.tsx e2e/study.spec.ts
git commit -m "feat: sessão de estudo com card que gira, gestos e desfazer"
```

---

### Task 18: Fim da sessão

**Files:**
- Modify (substituir todo): `src/ui/screens/SessionEnd.tsx`
- Modify: `e2e/study.spec.ts` (acrescentar um teste)

**Interfaces:**
- Consumes: `getStreak`, `forecastTomorrow` (Task 11); `parseDayKey` (Task 2); `SECONDS_PER_CARD` (Task 4); `Icon` (Task 13). Estado da rota: `{ answered: number; again: number; startedAt: number }` (Task 17).
- Produces: rota `/study/end`; sem estado na rota, redireciona para `/`.

- [ ] **Step 1: Acrescentar o teste ao fim de `e2e/study.spec.ts`**

```ts
test('resumo mostra cards, acerto, sequência e botões', async ({ page }) => {
  await setup(page, TWO);
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).click();
  await page.getByRole('button', { name: 'Mostrar resposta' }).click();
  await page.getByRole('button', { name: /^Fácil/ }).click();
  await expect(page.getByRole('heading', { name: 'Pronto por hoje' })).toBeVisible();
  await expect(page.locator('.stat').nth(0)).toContainText('2');
  await expect(page.locator('.stat').nth(1)).toContainText('100%');
  await expect(page.getByText('1 dia seguido')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Estudar mais 10 novos' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar ao início' }).click();
  await expect(page.getByText('Tudo em dia por hoje.')).toBeVisible();
});
```

Run: `npx playwright test e2e/study.spec.ts -g "resumo"` → Expected: FAIL.

- [ ] **Step 2: Substituir `src/ui/screens/SessionEnd.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Navigate, useLocation } from 'react-router';
import { forecastTomorrow, getStreak } from '../../data/overview';
import { SECONDS_PER_CARD } from '../../domain/queue';
import { parseDayKey } from '../../domain/studyDay';
import { Icon } from '../components/Icon';

interface EndState {
  answered: number;
  again: number;
  startedAt: number;
}

const WEEKDAY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function SessionEnd() {
  const state = useLocation().state as EndState | null;
  const data = useLiveQuery(async () => {
    const now = Date.now();
    const [streak, tomorrow] = await Promise.all([getStreak(now), forecastTomorrow(now)]);
    return { ...streak, tomorrow };
  }, []);

  if (!state) return <Navigate to="/" replace />;

  const accuracy = state.answered > 0 ? Math.round(((state.answered - state.again) / state.answered) * 100) : 0;
  const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60_000));

  return (
    <main className="screen">
      <div className="end__hero">
        <div className="end__check"><Icon name="check" size={34} stroke={2.4} /></div>
        <h1 className="title-serif" style={{ fontSize: 34 }}>Pronto por hoje</h1>
        <p>O que tu estudaste volta na hora certa.</p>
      </div>

      <div className="stats">
        <div className="stat"><span className="stat__value">{state.answered}</span><span className="stat__label">cards</span></div>
        <div className="stat"><span className="stat__value">{accuracy}%</span><span className="stat__label">de acerto</span></div>
        <div className="stat"><span className="stat__value">{minutes}</span><span className="stat__label">{minutes === 1 ? 'minuto' : 'minutos'}</span></div>
      </div>

      {data && (
        <div className="panel">
          <div className="row-between">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--ink)' }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name="flame" size={18} /></span>
              {data.streak.days} {data.streak.days === 1 ? 'dia seguido' : 'dias seguidos'}
            </span>
          </div>
          <div className="week">
            {data.week.map((d) => (
              <div key={d.key} className="week__day">
                <span className={`week__dot week__dot--${d.status}`} />
                {WEEKDAY[parseDayKey(d.key).getDay()]}
              </div>
            ))}
          </div>
          <p className="small muted">
            {data.streak.freezeAvailable
              ? 'Tu tens 1 folga nesta semana: perder um dia não zera a sequência.'
              : 'A folga desta semana já foi usada.'}
          </p>
        </div>
      )}

      {data && (
        <div className="row-between" style={{ padding: '0 4px', fontSize: 15 }}>
          <span className="muted">Amanhã</span>
          <span style={{ fontWeight: 600 }}>
            {data.tomorrow > 0
              ? `${data.tomorrow} cards · cerca de ${Math.ceil((data.tomorrow * SECONDS_PER_CARD) / 60)} min`
              : 'Nada agendado'}
          </span>
        </div>
      )}

      <div className="spacer" />
      <div className="stack">
        <Link to="/" replace className="btn btn--primary btn--block">Voltar ao início</Link>
        <Link to="/study?extra=10" replace className="btn btn--secondary btn--block">Estudar mais 10 novos</Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Rodar e ver passar**

Run: `npx playwright test e2e/study.spec.ts` → Expected: PASS (8 testes).

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/SessionEnd.tsx e2e/study.spec.ts
git commit -m "feat: resumo do fim da sessão com sequência e previsão"
```

---

### Task 19: Importar JSON (colar ou arquivo, pré-visualização)

**Files:**
- Modify (substituir todo): `src/ui/screens/Import.tsx`
- Create: `e2e/import.spec.ts`

**Interfaces:**
- Consumes: `parseCardJson`, `findWarnings`, `AI_PROMPT`, `ParsedDeck`, `ImportWarning` (Tasks 7–8); `importParsed` (Task 12); `listDecks`, `listDeckCards` (Task 9); `Icon`, `useToast`, `copyText` (Task 13).
- Produces: rota `/import?deck=ID`. Destino padrão: o baralho da URL; senão o baralho ativo com o mesmo nome do JSON; senão "novo baralho" (nome editável). Backup com vários baralhos importa tudo, sem pré-visualização por card.

- [ ] **Step 1: Escrever o teste e2e**

`e2e/import.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const FENCE = '`'.repeat(3);
const longBack = 'x'.repeat(320);
const AI_REPLY = `Claro! Aqui estão:
${FENCE}json
{"version":1,"deck":"Revolução Francesa","cards":[
  {"front":"Em que ano começou?","back":"1789"},
  {"front":"O que foi a Queda da Bastilha?","back":"Tomada da prisão em 14/07/1789"},
  {"front":"Explique tudo sobre Luís XVI","back":"${longBack}"}
]}
${FENCE}`;

test('cola resposta de IA, revisa e importa', async ({ page }) => {
  await page.goto('/#/import');
  await page.getByLabel('JSON dos cards').fill(AI_REPLY);
  await expect(page.getByText('Pré-visualização')).toBeVisible();
  const items = page.locator('.preview-item');
  await expect(items).toHaveCount(3);
  await expect(items.nth(2)).toContainText('Resposta longa demais para um card');
  await expect(items.nth(2).getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByLabel('Nome do novo baralho')).toHaveValue('Revolução Francesa');
  await page.getByRole('button', { name: 'Importar 2 cards' }).click();
  await expect(page.getByRole('heading', { name: 'Revolução Francesa' })).toBeVisible();
  await expect(page.locator('.card-item')).toHaveCount(2);
});

test('mostra o erro e não importa', async ({ page }) => {
  await page.goto('/#/import');
  await page.getByLabel('JSON dos cards').fill('{"cards":[{"front":"a"}]}');
  await expect(page.getByRole('alert')).toHaveText('O card 1 está sem verso.');
  await expect(page.getByRole('button', { name: /^Importar/ })).toBeDisabled();
});

test('texto com HTML aparece literal e não executa', async ({ page }) => {
  await page.goto('/#/import');
  const evil = '<img src=x onerror=\\"window.__xss=1\\">';
  await page.getByLabel('JSON dos cards').fill(`{"deck":"Seguro","cards":[{"front":"${evil}","back":"ok"}]}`);
  await page.getByRole('button', { name: 'Importar 1 card' }).click();
  await expect(page.getByText('<img src=x onerror="window.__xss=1">')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
});

test('abre arquivo .json', async ({ page }) => {
  await page.goto('/#/import');
  await page.getByRole('button', { name: 'Abrir arquivo' }).click();
  await page.getByLabel('Escolher arquivo .json').setInputFiles({
    name: 'cards.json',
    mimeType: 'application/json',
    buffer: Buffer.from('[{"front":"a","back":"b"}]'),
  });
  await expect(page.locator('.preview-item')).toHaveCount(1);
});
```

Run: `npx playwright test e2e/import.spec.ts` → Expected: FAIL.

- [ ] **Step 2: Substituir `src/ui/screens/Import.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { listDeckCards } from '../../data/cards';
import { listDecks } from '../../data/decks';
import { importParsed } from '../../data/importExport';
import { AI_PROMPT, findWarnings, parseCardJson, type ImportWarning, type ParsedDeck } from '../../domain/cardJson';
import type { Card } from '../../domain/types';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { copyText } from '../share';

const WARNING_TEXT: Record<ImportWarning, string> = {
  long: 'Resposta longa demais para um card',
  duplicate: 'Já existe neste baralho',
};
const NEW = 'new';

export default function Import() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const decks = useLiveQuery(() => listDecks(), []);

  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [text, setText] = useState('');
  const [target, setTarget] = useState(NEW);
  const [newName, setNewName] = useState('');
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => (text.trim() ? parseCardJson(text) : null), [text]);
  const single: ParsedDeck | null = parsed?.ok && parsed.decks.length === 1 ? parsed.decks[0] : null;

  useEffect(() => {
    if (!decks || !single) return;
    const fromUrl = decks.find((d) => d.id === params.get('deck'));
    const byName = single.name ? decks.find((d) => d.name === single.name) : undefined;
    setTarget(fromUrl?.id ?? byName?.id ?? NEW);
    setNewName(single.name ?? '');
  }, [decks, single, params]);

  const existing = useLiveQuery(
    () => (target !== NEW ? listDeckCards(target) : Promise.resolve([] as Card[])),
    [target],
  );
  const warnings = useMemo(() => (single ? findWarnings(single.cards, existing ?? []) : []), [single, existing]);

  useEffect(() => {
    setUnchecked(new Set(warnings.flatMap((w, i) => (w ? [i] : []))));
  }, [warnings]);

  const totalCards = parsed?.ok ? parsed.decks.reduce((n, d) => n + d.cards.length, 0) : 0;
  const selectedCount = single ? single.cards.length - unchecked.size : totalCards;
  const targetName = decks?.find((d) => d.id === target)?.name;
  const canImport = Boolean(parsed?.ok) && selectedCount > 0 && !busy && !(single && target === NEW && !newName.trim());

  function toggle(i: number) {
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  async function copyPrompt() {
    toast({ message: (await copyText(AI_PROMPT)) ? 'Prompt copiado. Cole na IA e escreva o tema.' : 'Não consegui copiar' });
  }

  async function pasteFromClipboard() {
    try {
      setText(await navigator.clipboard.readText());
    } catch {
      toast({ message: 'Cole o texto no campo abaixo' });
    }
  }

  async function onFile(file: File | undefined) {
    if (file) setText(await file.text());
  }

  async function doImport() {
    if (!parsed?.ok || !canImport) return;
    setBusy(true);
    try {
      let toImport: ParsedDeck[] = parsed.decks;
      let opts = {};
      if (single) {
        toImport = [{
          ...single,
          name: target === NEW ? newName.trim() : single.name,
          cards: single.cards.filter((_, i) => !unchecked.has(i)),
        }];
        if (target !== NEW) opts = { targetDeckId: target };
      }
      const r = await importParsed(toImport, opts);
      toast({ message: `${r.imported} ${r.imported === 1 ? 'card importado' : 'cards importados'}` });
      navigate(r.deckIds.length === 1 ? `/deck/${r.deckIds[0]}` : '/', { replace: true });
    } catch {
      toast({ message: 'Não foi possível importar. Nada foi salvo.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      <div className="topbar">
        <button type="button" className="icon-btn" aria-label="Voltar" onClick={() => navigate(-1)}><Icon name="back" /></button>
        <h1 className="topbar__title">Importar cards</h1>
        <span className="icon-btn" aria-hidden="true" />
      </div>

      <div className="ai-card">
        <div style={{ flex: 1 }}>
          <strong>Criar com qualquer IA</strong>
          <p>Copie o prompt, cole no ChatGPT, Claude ou Gemini, escreva o tema e traga a resposta para cá.</p>
        </div>
        <button type="button" className="btn btn--secondary" style={{ height: 44, fontSize: 13, padding: '0 12px' }}
          onClick={() => void copyPrompt()}>
          <Icon name="copy" size={16} /> Copiar prompt
        </button>
      </div>

      <div className="segmented">
        <button type="button" aria-pressed={mode === 'paste'} onClick={() => setMode('paste')}>Colar JSON</button>
        <button type="button" aria-pressed={mode === 'file'} onClick={() => setMode('file')}>Abrir arquivo</button>
      </div>

      {mode === 'paste' ? (
        <div className="stack">
          <textarea className="code" aria-label="JSON dos cards" placeholder='{ "deck": "…", "cards": [ … ] }'
            value={text} onChange={(e) => setText(e.target.value)} />
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start' }} onClick={() => void pasteFromClipboard()}>
            Colar da área de transferência
          </button>
        </div>
      ) : (
        <label className="field">
          Escolher arquivo .json
          <input type="file" accept=".json,application/json,text/plain" onChange={(e) => void onFile(e.target.files?.[0])} />
        </label>
      )}

      {parsed && !parsed.ok && <p className="error" role="alert">{parsed.error}</p>}

      {single && (
        <>
          <label className="field">
            Baralho de destino
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value={NEW}>Novo baralho</option>
              {decks?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          {target === NEW && (
            <label className="field">
              Nome do novo baralho
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Revolução Francesa" />
            </label>
          )}
          <div className="row-between">
            <h2 className="title-serif section-title">Pré-visualização</h2>
            <span className="small muted">{selectedCount} de {single.cards.length} marcados</span>
          </div>
          <div className="list">
            {single.cards.map((c, i) => {
              const off = unchecked.has(i);
              const warning = warnings[i];
              return (
                <label key={i} className={off ? 'preview-item preview-item--off' : 'preview-item'}>
                  <input type="checkbox" checked={!off} onChange={() => toggle(i)} />
                  <span className="preview-item__text">
                    <span style={{ fontFamily: 'var(--serif)', fontSize: 16 }}>{c.front}</span>
                    <span className="small muted">{c.back.length > 140 ? `${c.back.slice(0, 140)}…` : c.back}</span>
                    {warning && <span className="preview-item__warning">{WARNING_TEXT[warning]}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </>
      )}

      {parsed?.ok && !single && (
        <div className="panel">
          <p><strong>Backup com {parsed.decks.length} baralhos</strong></p>
          {parsed.decks.map((d, i) => (
            <p key={i} className="small muted">{d.name ?? 'Sem nome'} · {d.cards.length} cards</p>
          ))}
        </div>
      )}

      <div className="spacer" />
      <div className="sticky-bottom">
        <button type="button" className="btn btn--primary btn--block" disabled={!canImport} onClick={() => void doImport()}>
          Importar {selectedCount} {selectedCount === 1 ? 'card' : 'cards'}
          {single && target !== NEW && targetName ? ` para “${targetName}”` : ''}
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Rodar e ver passar**

Run: `npx playwright test e2e/import.spec.ts` → Expected: PASS (4 testes).

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/Import.tsx e2e/import.spec.ts
git commit -m "feat: importação de JSON com pré-visualização e avisos"
```

---

### Task 20: Ajustes e backup completo

**Files:**
- Modify (substituir todo): `src/ui/screens/Settings.tsx`
- Create: `e2e/settings.spec.ts`

**Interfaces:**
- Consumes: `getSettings`, `updateSettings` (Task 10); `exportBackupJson`, `markExported` (Task 12); `studyDayKey` (Task 2); `TabBar`, `useToast`, `shareJson` (Task 13).
- Produces: rota `/settings`. Link "Como o Lembra funciona" → `/welcome?again=1` (tela criada na Task 21).

- [ ] **Step 1: Escrever o teste e2e**

`e2e/settings.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('ajustes ficam salvos depois de recarregar', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByLabel('Minutos por dia').selectOption('20');
  await page.getByText('Avançado').click();
  await page.getByLabel('Meta de lembrança').selectOption('0.85');
  await page.reload();
  await expect(page.getByLabel('Minutos por dia')).toHaveValue('20');
  await page.getByText('Avançado').click();
  await expect(page.getByLabel('Meta de lembrança')).toHaveValue('0.85');
});

test('exportar tudo gera arquivo de backup', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true });
  });
  await page.goto('/#/settings');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar tudo' }).click();
  expect((await downloading).suggestedFilename()).toMatch(/^lembra-backup-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(page.getByText(/Último backup: hoje/)).toBeVisible();
});
```

Run: `npx playwright test e2e/settings.spec.ts` → Expected: FAIL.

- [ ] **Step 2: Substituir `src/ui/screens/Settings.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks';
import { useId } from 'react';
import { Link } from 'react-router';
import { exportBackupJson, markExported } from '../../data/importExport';
import { getSettings, updateSettings } from '../../data/settings';
import { studyDayKey } from '../../domain/studyDay';
import type { Settings } from '../../domain/types';
import { TabBar } from '../components/TabBar';
import { useToast } from '../components/Toast';
import { shareJson } from '../share';

function SelectRow({ label, hint, value, options, onChange }: {
  label: string;
  hint?: string;
  value: number;
  options: { value: number; label: string }[];
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="settings-row">
      <div>
        <label htmlFor={id} className="settings-row__label">{label}</label>
        {hint && <p className="settings-row__hint">{hint}</p>}
      </div>
      <select id={id} className="select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function lastBackupText(s: Settings): string {
  if (s.lastExportAt === undefined) return 'Nenhum backup ainda.';
  const sameDay = studyDayKey(s.lastExportAt, s.dayStartHour) === studyDayKey(Date.now(), s.dayStartHour);
  if (sameDay) return 'Último backup: hoje.';
  return `Último backup: ${new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(s.lastExportAt)}.`;
}

export default function SettingsScreen() {
  const settings = useLiveQuery(() => getSettings(), []);
  const toast = useToast();

  if (!settings) return <main className="screen screen--tabs" aria-busy="true" />;
  const set = (patch: Partial<Omit<Settings, 'id'>>) => void updateSettings(patch);

  async function backup() {
    if (!settings) return;
    const now = Date.now();
    const result = await shareJson(`lembra-backup-${studyDayKey(now, settings.dayStartHour)}.json`, await exportBackupJson());
    if (result !== 'cancelled') {
      await markExported(now);
      toast({ message: 'Backup exportado' });
    }
  }

  return (
    <main className="screen screen--tabs">
      <h1 className="title-serif page-title">Ajustes</h1>

      <section className="settings-group">
        <SelectRow label="Minutos por dia" hint="Quantas revisões cabem no teu dia." value={settings.minutesPerDay}
          options={[5, 10, 15, 20, 30, 45, 60].map((v) => ({ value: v, label: `${v} min` }))}
          onChange={(v) => set({ minutesPerDay: v })} />
        <SelectRow label="Cards novos por dia" value={settings.newPerDay}
          options={[0, 5, 10, 15, 20, 30].map((v) => ({ value: v, label: String(v) }))}
          onChange={(v) => set({ newPerDay: v })} />
      </section>

      <section className="settings-group">
        <h2 className="settings-group__title">Backup</h2>
        <button type="button" className="settings-action" onClick={() => void backup()}>Exportar tudo</button>
        <Link to="/import" className="settings-action">Importar backup</Link>
        <p className="small muted" style={{ margin: '10px 0' }}>{lastBackupText(settings)}</p>
      </section>

      <section className="settings-group">
        <Link to="/welcome?again=1" className="settings-action">Como o Lembra funciona</Link>
      </section>

      <details className="settings-group">
        <summary>Avançado</summary>
        <SelectRow label="Meta de lembrança" hint="Maior = mais revisões, menos esquecimento." value={settings.desiredRetention}
          options={[0.8, 0.85, 0.9, 0.95].map((v) => ({ value: v, label: `${Math.round(v * 100)}%` }))}
          onChange={(v) => set({ desiredRetention: v })} />
        <SelectRow label="O dia começa às" hint="Para quem estuda de madrugada." value={settings.dayStartHour}
          options={[0, 1, 2, 3, 4, 5, 6].map((v) => ({ value: v, label: `${v}h` }))}
          onChange={(v) => set({ dayStartHour: v })} />
      </details>

      <TabBar />
    </main>
  );
}
```

- [ ] **Step 3: Rodar e ver passar**

Run: `npx playwright test e2e/settings.spec.ts` → Expected: PASS (2 testes).

- [ ] **Step 4: Commit**

```bash
git add src/ui/screens/Settings.tsx e2e/settings.spec.ts
git commit -m "feat: tela de ajustes com backup completo"
```

---

### Task 21: Onboarding de primeira abertura

**Files:**
- Modify (substituir todo): `src/ui/screens/Welcome.tsx`
- Modify: `src/ui/screens/Today.tsx` (reativar o redirecionamento)
- Create: `e2e/welcome.spec.ts`

**Interfaces:**
- Consumes: `getSettings`, `updateSettings` (Task 10); `FlipCard` (Task 17); `AnswerButtons` (Task 17); `Icon` (Task 13).
- Produces: rota `/welcome` (primeira abertura) e `/welcome?again=1` (revisitar pelos Ajustes). Texto da spec, seção 3.1, sem mencionar o Anki.

- [ ] **Step 1: Escrever o teste e2e**

`e2e/welcome.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('primeira abertura mostra o onboarding e termina criando o primeiro baralho', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Estude menos, lembre mais.' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Tente lembrar antes de virar.' })).toBeVisible();
  await page.getByText('Qual é a capital da Austrália?').first().click();
  await expect(page.getByText('Canberra')).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Diga como foi.' })).toBeVisible();
  await expect(page.getByText(/Dunlosky/)).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Pouco, todo dia.' })).toBeVisible();
  await page.getByRole('button', { name: '15 min' }).click();
  await page.getByRole('button', { name: 'Criar meu primeiro baralho' }).click();

  await expect(page.getByRole('dialog', { name: 'Novo baralho' })).toBeVisible();
  await page.goto('/#/settings');
  await expect(page.getByLabel('Minutos por dia')).toHaveValue('15');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Estude menos, lembre mais.' })).toHaveCount(0);
});

test('Pular marca como visto', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.reload();
  await expect(page.getByText('Crie teu primeiro baralho para começar.')).toBeVisible();
});

test('dá para rever pelos Ajustes e volta para Ajustes', async ({ page }) => {
  await page.goto('/#/settings');
  await page.getByRole('link', { name: 'Como o Lembra funciona' }).click();
  await expect(page.getByRole('heading', { name: 'Estude menos, lembre mais.' })).toBeVisible();
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
});
```

Run: `npx playwright test e2e/welcome.spec.ts` → Expected: FAIL.

- [ ] **Step 2: Substituir `src/ui/screens/Welcome.tsx`**

```tsx
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { updateSettings } from '../../data/settings';
import { AnswerButtons } from '../components/AnswerButtons';
import { FlipCard } from '../components/FlipCard';
import { Icon } from '../components/Icon';

const MINUTE_OPTIONS = [5, 10, 15];

function ForgettingCurve() {
  return (
    <svg className="curve" viewBox="0 0 320 200" role="img"
      aria-label="Curva do esquecimento: sem revisão a lembrança cai rápido; com revisões ela cai cada vez mais devagar">
      <line x1="24" y1="176" x2="304" y2="176" stroke="#D5CBB9" strokeWidth="2" />
      <line x1="24" y1="16" x2="24" y2="176" stroke="#D5CBB9" strokeWidth="2" />
      <path d="M24 24 C 60 120, 110 160, 300 170" fill="none" stroke="#D5CBB9" strokeWidth="3" strokeDasharray="6 6" />
      <path d="M24 24 C 40 70, 60 90, 70 96 L 70 24 C 95 60, 120 76, 140 80 L 140 24 C 175 48, 215 58, 240 60 L 240 24 C 265 34, 290 40, 304 42"
        fill="none" stroke="#B5482A" strokeWidth="3.5" strokeLinejoin="round" />
      {[70, 140, 240].map((x) => <circle key={x} cx={x} cy="24" r="6" fill="#1E1A16" />)}
      <text x="30" y="194" fontSize="12" fill="#6B6259">tempo →</text>
    </svg>
  );
}

export default function Welcome() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const again = params.get('again') === '1';
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [minutes, setMinutes] = useState(10);

  async function finish(createDeck: boolean) {
    await updateSettings({ onboardedAt: Date.now(), ...(createDeck ? { minutesPerDay: minutes } : {}) });
    if (again) navigate('/settings', { replace: true });
    else navigate(createDeck ? '/?newDeck=1' : '/', { replace: true });
  }

  const slides = [
    {
      title: 'Estude menos, lembre mais.',
      visual: <ForgettingCurve />,
      body: (
        <p className="welcome__text">
          A gente esquece rápido. Cada revisão na hora certa deixa o esquecimento mais lento. O Lembra revisa cada coisa
          pouco antes de você esquecer.
        </p>
      ),
    },
    {
      title: 'Tente lembrar antes de virar.',
      visual: (
        <FlipCard front="Qual é a capital da Austrália?" back="Canberra" flipped={flipped}
          onFlip={() => setFlipped(true)} onSwipe={() => setFlipped(false)} />
      ),
      body: <p className="welcome__text">Puxar a resposta da memória fixa muito mais do que reler. Toque no card.</p>,
    },
    {
      title: 'Diga como foi.',
      visual: (
        <div style={{ margin: 'auto 0', width: '100%' }}>
          <AnswerButtons onAnswer={() => {}} />
        </div>
      ),
      body: (
        <>
          <p className="welcome__text">Acertou? O card volta daqui a dias, depois semanas. Errou? Volta logo.</p>
          <p className="welcome__note">
            Repetição espaçada e recordação ativa estão entre as técnicas de estudo com mais evidência
            (Dunlosky et al., 2013).
          </p>
        </>
      ),
    },
    {
      title: 'Pouco, todo dia.',
      visual: (
        <ul className="welcome__tips" style={{ margin: 'auto 0' }}>
          <li><Icon name="check" size={20} stroke={2.4} /> Uma ideia por card.</li>
          <li><Icon name="check" size={20} stroke={2.4} /> Alguns minutos por dia valem mais que horas de vez em quando.</li>
        </ul>
      ),
      body: again ? null : (
        <div className="stack">
          <span className="field">Quanto tempo por dia?</span>
          <div className="choice">
            {MINUTE_OPTIONS.map((m) => (
              <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} min</button>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const last = step === slides.length - 1;
  const slide = slides[step];

  return (
    <main className="welcome">
      <div className="welcome__top">
        <div className="welcome__dots" aria-label={`Passo ${step + 1} de ${slides.length}`}>
          {slides.map((_, i) => (
            <span key={i} className={i === step ? 'welcome__dot welcome__dot--active' : 'welcome__dot'} />
          ))}
        </div>
        {!last && <button type="button" className="link-btn" onClick={() => void finish(false)}>Pular</button>}
      </div>

      <AnimatePresence mode="wait">
        <motion.section key={step} className="welcome__slide" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
          <div className="welcome__visual">{slide.visual}</div>
          <h1 className="welcome__title">{slide.title}</h1>
          {slide.body}
        </motion.section>
      </AnimatePresence>

      {last ? (
        <button type="button" className="btn btn--primary btn--block" onClick={() => void finish(!again)}>
          {again ? 'Voltar aos ajustes' : 'Criar meu primeiro baralho'}
        </button>
      ) : (
        <button type="button" className="btn btn--primary btn--block" onClick={() => setStep((s) => s + 1)}>Continuar</button>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Reativar o redirecionamento em `src/ui/screens/Today.tsx`**

Troque `if (false && overview && !overview.onboarded)` por:

```ts
    if (overview && !overview.onboarded) navigate('/welcome', { replace: true });
```

- [ ] **Step 4: Rodar todos os testes e2e**

Run: `npx playwright test` → Expected: PASS (todas as specs; `openApp` agora pula o onboarding de verdade).

- [ ] **Step 5: Commit**

```bash
git add src/ui/screens/Welcome.tsx src/ui/screens/Today.tsx e2e/welcome.spec.ts
git commit -m "feat: onboarding de primeira abertura explicando o método"
```

---

### Task 22: PWA instalável e offline

**Files:**
- Create: `public/icon.svg`, `src/ui/components/UpdatePrompt.tsx`, `e2e/pwa.spec.ts`
- Generate: `public/favicon.ico`, `public/pwa-64x64.png`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-icon-512x512.png`, `public/apple-touch-icon-180x180.png`
- Modify: `vite.config.ts`, `index.html`, `tsconfig.json`, `src/app/App.tsx`

**Interfaces:**
- Consumes: `App` (Task 13).
- Produces: `manifest.webmanifest` (nome "Lembra", `display: standalone`), service worker com precache do app, aviso "Atualização disponível — tocar para recarregar" que só recarrega quando tocado.

- [ ] **Step 1: Escrever o teste e2e**

`e2e/pwa.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('publica manifesto instalável', async ({ page, request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest).toMatchObject({ name: 'Lembra', short_name: 'Lembra', display: 'standalone', lang: 'pt-BR' });
  expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
});
```

Run: `npx playwright test e2e/pwa.spec.ts` → Expected: FAIL (404 no manifesto).

- [ ] **Step 2: Instalar o plugin e o gerador de ícones**

```bash
npm install -D vite-plugin-pwa @vite-pwa/assets-generator
```

- [ ] **Step 3: Criar `public/icon.svg` e gerar os ícones**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#1E1A16"/>
  <g transform="rotate(-6 256 256)">
    <rect x="120" y="150" width="272" height="212" rx="28" fill="#FFFDF8"/>
    <rect x="120" y="198" width="272" height="8" fill="#B5482A"/>
    <rect x="152" y="240" width="208" height="6" rx="3" fill="#DCE6F0"/>
    <rect x="152" y="276" width="208" height="6" rx="3" fill="#DCE6F0"/>
    <rect x="152" y="312" width="140" height="6" rx="3" fill="#DCE6F0"/>
  </g>
</svg>
```

Run: `npx pwa-assets-generator --preset minimal-2023 public/icon.svg`
Expected: os 6 arquivos listados em "Generate" aparecem em `public/`.

- [ ] **Step 4: Configurar o plugin em `vite.config.ts`** (substituir todo)

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'Lembra',
        short_name: 'Lembra',
        description: 'Flashcards com repetição espaçada',
        lang: 'pt-BR',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F3EEE4',
        theme_color: '#F3EEE4',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Tipos e `index.html`**

Em `tsconfig.json`, troque a linha `types` por:

```json
    "types": ["vite/client", "node", "vite-plugin-pwa/react"]
```

Em `index.html`, logo depois da meta `description`, acrescente:

```html
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Lembra" />
```

- [ ] **Step 6: Criar `src/ui/components/UpdatePrompt.tsx`**

```tsx
import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <button type="button" className="update-banner" onClick={() => void updateServiceWorker(true)}>
      Atualização disponível — tocar para recarregar
    </button>
  );
}
```

Em `src/app/App.tsx`, importe e coloque ao lado do roteador:

```tsx
import { UpdatePrompt } from '../ui/components/UpdatePrompt';
// ...
      <ToastProvider>
        <RouterProvider router={router} />
        <UpdatePrompt />
      </ToastProvider>
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm run build` → Expected: saída lista `dist/sw.js` e `dist/manifest.webmanifest`.
Run: `npx playwright test` → Expected: PASS (todas as specs).

- [ ] **Step 8: Commit**

```bash
git add public vite.config.ts index.html tsconfig.json src/ui/components/UpdatePrompt.tsx src/app/App.tsx e2e/pwa.spec.ts package.json package-lock.json
git commit -m "feat: PWA instalável e offline com aviso de atualização"
```

---

### Task 23: Verificação final e teste no celular

**Files:** nenhum arquivo novo (só correções, se algo falhar).

- [ ] **Step 1: Rodar tudo do zero**

```bash
npm test
npm run build
npx playwright test
```

Expected: todos PASS, build sem avisos de tipo. Se algo falhar, corrija na task de origem e registre no commit.

- [ ] **Step 2: Conferir os commits antes de qualquer push**

```bash
git log --format="%h %s%n%b" | grep -niE "claude|co-authored|generated with|anthropic|🤖"
```

Expected: nenhuma linha. Se aparecer, remova a marca (ver regras globais do usuário) antes de publicar.

- [ ] **Step 3: Publicar para testar no celular — PERGUNTE AO USUÁRIO ANTES**

Instalar o PWA e usar offline exige HTTPS. Publicar é uma ação externa: pergunte ao usuário se pode publicar (ex.: na Vercel, que ele tem conectada). Com a aprovação:

```bash
npx vercel deploy --prod
```

Sem aprovação, a alternativa local é `npm run dev -- --host` e abrir `http://<IP-do-PC>:5173` no celular na mesma rede. Nesse modo o app funciona, mas não instala nem funciona offline (o navegador só libera service worker em HTTPS).

- [ ] **Step 4: Roteiro manual no Android (Chrome)**

1. Abrir o link → aparece o onboarding → tocar no card de prática → escolher 10 min → "Criar meu primeiro baralho".
2. Criar 3 cards com "Salvar e próximo" (o teclado não deve fechar entre um card e outro).
3. Menu do Chrome → "Instalar app" → abrir pelo ícone na tela inicial.
4. Ativar modo avião → abrir o app → estudar: o card gira, arrastar para a direita responde Bom, "desfazer" funciona.
5. Importar: copiar o prompt, pedir cards a uma IA, colar a resposta, conferir a pré-visualização, importar.
6. Exportar um baralho pelo menu de compartilhar (WhatsApp ou Drive).
7. Registrar qualquer problema como item novo antes de encerrar a etapa.

- [ ] **Step 5: Commit final (se houve correções)**

```bash
git add -A
git commit -m "fix: ajustes da verificação final"
```
