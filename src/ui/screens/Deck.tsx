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
import { MotionItem, MotionList } from '../components/MotionList';
import { DELETE_ERROR, UNDO_ERROR, UNDO_MS, useSafeAction, useToast } from '../components/Toast';
import { copyText, SAVED_MESSAGE, shareJson, slugify } from '../share';

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
  const run = useSafeAction();
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
    if ((await shareJson(`${slugify(deck.name)}${suffix}.json`, json)) === 'saved') toast({ message: SAVED_MESSAGE });
  }

  const exportDeck = (mode: 'cards' | 'progress' | 'copy') => run(() => exportAs(mode), 'Não foi possível exportar.');

  async function removeDeck() {
    if (!deck) return;
    const deckId = deck.id;
    await deleteDeck(deckId);
    setMenuOpen(false);
    toast({ message: 'Baralho apagado', action: { label: 'Desfazer', onAction: () => run(() => restoreDeck(deckId), UNDO_ERROR) } }, UNDO_MS);
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
          {cards.length} {cards.length === 1 ? 'card' : 'cards'} · {dueCount} para hoje · {newCount} {newCount === 1 ? 'novo' : 'novos'}
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
        <MotionList>
          {shown.map((c, i) => {
            const chip = chipFor(c, now, end);
            return (
              <MotionItem key={c.id} index={i}>
                <Link to={`/card/${c.id}/edit`} className="card-item">
                  <span className="card-item__text">
                    <span className="card-item__front">{c.front}</span>
                    <span className="card-item__back">{c.back}</span>
                  </span>
                  <span className={`chip chip--${chip.tone}`}>{chip.label}</span>
                </Link>
              </MotionItem>
            );
          })}
          {shown.length === 0 && <p key="nada" className="muted" style={{ textAlign: 'center' }}>Nada encontrado.</p>}
        </MotionList>
      )}

      <BottomSheet open={exportOpen} onClose={() => setExportOpen(false)} title="Exportar baralho">
        <div className="stack">
          <button type="button" className="btn btn--secondary btn--block" onClick={() => exportDeck('cards')}>Compartilhar só os cards</button>
          <button type="button" className="btn btn--secondary btn--block" onClick={() => exportDeck('progress')}>Compartilhar com progresso</button>
          <button type="button" className="btn btn--secondary btn--block" onClick={() => exportDeck('copy')}>
            <Icon name="copy" size={18} /> Copiar JSON
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={menuOpen} onClose={() => setMenuOpen(false)} title={deck.name}>
        <div className="stack">
          <button type="button" className="btn btn--secondary btn--block" onClick={() => { setMenuOpen(false); setRenameOpen(true); }}>
            Renomear baralho
          </button>
          <button type="button" className="btn btn--danger btn--block" onClick={() => run(removeDeck, DELETE_ERROR)}>Apagar baralho</button>
        </div>
      </BottomSheet>

      <DeckSheet open={renameOpen} onClose={() => setRenameOpen(false)} deck={deck} />
    </main>
  );
}
