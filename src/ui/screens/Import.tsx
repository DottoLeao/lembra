import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
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

interface Edits {
  owner: ParsedDeck | null;
  target?: string;
  name?: string;
  manual: Record<number, boolean>; // true = marcado
}

export default function Import() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const decks = useLiveQuery(() => listDecks(), []);

  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  // escolhas do usuário valem só para o JSON colado atual (some quando o JSON muda)
  const [edits, setEdits] = useState<Edits>({ owner: null, manual: {} });

  const parsed = useMemo(() => (text.trim() ? parseCardJson(text) : null), [text]);
  const single: ParsedDeck | null = parsed?.ok && parsed.decks.length === 1 ? parsed.decks[0] : null;

  const mine = edits.owner === single ? edits : null;
  const fromUrl = decks?.find((d) => d.id === params.get('deck'));
  const byName = single?.name ? decks?.find((d) => d.name === single.name) : undefined;
  const target = mine?.target ?? fromUrl?.id ?? byName?.id ?? NEW;
  const newName = mine?.name ?? single?.name ?? '';

  function edit(patch: Partial<Omit<Edits, 'owner'>>) {
    setEdits((prev) => ({ ...(prev.owner === single ? prev : { owner: single, manual: {} }), ...patch }));
  }

  const existing = useLiveQuery(
    () => (target !== NEW ? listDeckCards(target) : Promise.resolve([] as Card[])),
    [target],
  );
  const warnings = useMemo(() => (single ? findWarnings(single.cards, existing ?? []) : []), [single, existing]);
  // estado final de cada card: escolha manual, senão desmarcado se tiver aviso
  const isOff = (i: number) => !(mine?.manual[i] ?? !warnings[i]);
  const offCount = single ? single.cards.filter((_, i) => isOff(i)).length : 0;

  const totalCards = parsed?.ok ? parsed.decks.reduce((n, d) => n + d.cards.length, 0) : 0;
  const selectedCount = single ? single.cards.length - offCount : totalCards;
  const targetName = decks?.find((d) => d.id === target)?.name;
  const canImport = Boolean(parsed?.ok) && selectedCount > 0 && !busy && !(single && target === NEW && !newName.trim());

  function toggle(i: number) {
    edit({ manual: { ...mine?.manual, [i]: isOff(i) } });
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
          cards: single.cards.filter((_, i) => !isOff(i)),
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
            <select className="select" value={target} onChange={(e) => edit({ target: e.target.value })}>
              <option value={NEW}>Novo baralho</option>
              {decks?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          {target === NEW && (
            <label className="field">
              Nome do novo baralho
              <input className="input" value={newName} onChange={(e) => edit({ name: e.target.value })} placeholder="Ex.: Revolução Francesa" />
            </label>
          )}
          <div className="row-between">
            <h2 className="title-serif section-title">Pré-visualização</h2>
            <span className="small muted">{selectedCount} de {single.cards.length} marcados</span>
          </div>
          <div className="list">
            {single.cards.map((c, i) => {
              const off = isOff(i);
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
