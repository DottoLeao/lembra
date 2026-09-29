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
