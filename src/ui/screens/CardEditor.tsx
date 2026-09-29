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
