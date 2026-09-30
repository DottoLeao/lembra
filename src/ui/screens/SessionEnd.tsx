import { useLiveQuery } from 'dexie-react-hooks';
import { Link, Navigate, useLocation } from 'react-router';
import { forecastTomorrow, getStreak } from '../../data/overview';
import { SECONDS_PER_CARD } from '../../domain/queue';
import { parseDayKey } from '../../domain/studyDay';
import { CountUp } from '../components/CountUp';
import { Icon } from '../components/Icon';

interface EndState {
  answered: number;
  again: number;
  startedAt: number;
}

const WEEKDAY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function SessionEnd() {
  const state = useLocation().state as EndState | null;
  const data = useLiveQuery(async () => {
    const now = Date.now();
    const [streak, tomorrow] = await Promise.all([getStreak(now), forecastTomorrow(now)]);
    return { ...streak, tomorrow };
  }, []);

  if (!state) return <Navigate to="/" replace />;

  const accuracy = state.answered > 0 ? Math.round(((state.answered - state.again) / state.answered) * 100) : 0;
  const minutes = Math.max(1, Math.round((Date.now() - state.startedAt) / 60_000));

  return (
    <main className="screen">
      <div className="end__hero">
        <div className="end__check"><Icon name="check" size={34} stroke={2.4} /></div>
        <h1 className="title-serif" style={{ fontSize: 34 }}>Pronto por hoje</h1>
        <p>O que tu estudaste volta na hora certa.</p>
      </div>

      <div className="stats">
        <div className="stat"><span className="stat__value"><CountUp value={state.answered} /></span><span className="stat__label">cards</span></div>
        <div className="stat"><span className="stat__value"><CountUp value={accuracy} />%</span><span className="stat__label">de acerto</span></div>
        <div className="stat"><span className="stat__value"><CountUp value={minutes} /></span><span className="stat__label">{minutes === 1 ? 'minuto' : 'minutos'}</span></div>
      </div>

      {data && (
        <div className="panel">
          <div className="row-between">
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: 'var(--ink)' }}>
              <span style={{ color: 'var(--accent)', display: 'flex' }}><Icon name="flame" size={18} /></span>
              {data.streak.days} {data.streak.days === 1 ? 'dia seguido' : 'dias seguidos'}
            </span>
          </div>
          <div className="week">
            {data.week.map((d) => (
              <div key={d.key} className="week__day">
                <span className={`week__dot week__dot--${d.status}`} />
                {WEEKDAY[parseDayKey(d.key).getDay()]}
              </div>
            ))}
          </div>
          <p className="small muted">
            {data.streak.freezeAvailable
              ? 'Tu tens 1 folga nesta semana: perder um dia não zera a sequência.'
              : 'A folga desta semana já foi usada.'}
          </p>
        </div>
      )}

      {data && (
        <div className="row-between" style={{ padding: '0 4px', fontSize: 15 }}>
          <span className="muted">Amanhã</span>
          <span style={{ fontWeight: 600 }}>
            {data.tomorrow > 0
              ? `${data.tomorrow} cards · cerca de ${Math.ceil((data.tomorrow * SECONDS_PER_CARD) / 60)} min`
              : 'Nada agendado'}
          </span>
        </div>
      )}

      <div className="spacer" />
      <div className="stack">
        <Link to="/" replace className="btn btn--primary btn--block">Voltar ao início</Link>
        <Link to="/study?extra=10" replace className="btn btn--secondary btn--block">Estudar mais 10 novos</Link>
      </div>
    </main>
  );
}
