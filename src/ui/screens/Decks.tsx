import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { getTodayOverview } from '../../data/overview';
import { DeckRow } from '../components/DeckRow';
import { MotionItem, MotionList } from '../components/MotionList';
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
          <MotionList>
            {overview.decks.map((d, i) => <MotionItem key={d.deck.id} index={i}><DeckRow overview={d} /></MotionItem>)}
          </MotionList>
        ))}
      <DeckSheet open={sheet} onClose={() => setSheet(false)} />
    </main>
  );
}
