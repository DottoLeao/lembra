import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getTodayOverview } from '../../data/overview';
import { DeckRow } from '../components/DeckRow';
import { DeckSheet } from '../components/DeckSheet';

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
    </main>
  );
}
