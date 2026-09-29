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
