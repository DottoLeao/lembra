import { useEffect, useState, type FormEvent } from 'react';
import { createDeck, DECK_COLORS, updateDeck } from '../../data/decks';
import type { Deck } from '../../domain/types';
import { BottomSheet } from './BottomSheet';
import { useSafeAction } from './Toast';

export function DeckSheet({ open, onClose, deck, onSaved }: {
  open: boolean;
  onClose: () => void;
  deck?: Deck;
  onSaved?: (deck: Deck) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DECK_COLORS[0]);
  const run = useSafeAction();

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
      <form className="stack" onSubmit={(e) => run(() => submit(e))}>
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
