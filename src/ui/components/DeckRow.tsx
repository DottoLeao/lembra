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
