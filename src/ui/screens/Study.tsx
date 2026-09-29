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
import { UNDO_ERROR, useSafeAction } from '../components/Toast';

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
  const run = useSafeAction();

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
        <button type="button" className="icon-btn" aria-label="Encerrar sessão" onClick={() => run(() => finish(session))}>
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
          onClick={() => run(undo, UNDO_ERROR)}>
          <Icon name="undo" />
        </button>
      </div>

      <FlipCard
        key={`${card.id}:${card.fsrs.reps}`}
        front={card.front}
        back={card.back}
        flipped={flipped}
        onFlip={() => setFlipped(true)}
        onSwipe={(dir) => run(() => answer(dir === 'right' ? 3 : 1))}
      />

      <div className="study__bottom">
        {flipped ? (
          <>
            <AnswerButtons intervals={intervals} onAnswer={(r) => run(() => answer(r))} />
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
