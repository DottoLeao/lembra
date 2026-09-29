import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { exportBackupJson, markExported } from '../../data/importExport';
import { getTodayOverview } from '../../data/overview';
import { studyDayKey } from '../../domain/studyDay';
import { DeckRow } from '../components/DeckRow';
import { DeckSheet } from '../components/DeckSheet';
import { Icon } from '../components/Icon';
import { TabBar } from '../components/TabBar';
import { BACKUP_ERROR, useSafeAction, useToast } from '../components/Toast';
import { shareJson } from '../share';
import { readSession, writeSession } from '../storage';

function greeting(hour: number): string {
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatToday(d: Date): string {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Today() {
  const overview = useLiveQuery(() => getTodayOverview(Date.now()), []);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const run = useSafeAction();
  const [sheet, setSheet] = useState(params.get('newDeck') === '1');
  const [backupDismissed, setBackupDismissed] = useState(() => readSession('backupDismissed') === '1');

  useEffect(() => {
    if (overview && !overview.onboarded) navigate('/welcome', { replace: true });
  }, [overview, navigate]);

  function closeSheet() {
    setSheet(false);
    if (params.has('newDeck')) setParams({}, { replace: true });
  }

  async function backupNow() {
    const now = Date.now();
    const result = await shareJson(`lembra-backup-${studyDayKey(now, 4)}.json`, await exportBackupJson());
    if (result !== 'cancelled') {
      await markExported(now);
      toast({ message: 'Backup exportado' });
    }
  }

  function dismissBackup() {
    writeSession('backupDismissed', '1');
    setBackupDismissed(true);
  }

  if (!overview) return <main className="screen screen--tabs" aria-busy="true" />;
  const { queue, decks, streak } = overview;
  const total = queue.cards.length;
  const now = new Date();

  return (
    <main className="screen screen--tabs">
      <header className="row-between">
        <div>
          <p className="today__date">{formatToday(now)}</p>
          <h1 className="title-serif today__greeting">{greeting(now.getHours())}</h1>
        </div>
        <span className="pill" aria-label={`Sequência de ${streak.days} dias`}>
          <Icon name="flame" size={16} />
          {streak.days} {streak.days === 1 ? 'dia' : 'dias'}
        </span>
      </header>

      {overview.backupDue && !backupDismissed && (
        <div className="notice">
          <p>Faz tempo que tu não exportas um backup.</p>
          <button type="button" className="link-btn" onClick={() => run(backupNow, BACKUP_ERROR)}>Exportar</button>
          <button type="button" className="icon-btn" aria-label="Dispensar aviso" onClick={dismissBackup}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      <section className="hero-stack">
        <div className="hero ruled">
          <span className="label">Para hoje</span>
          {total > 0 ? (
            <>
              <div className="hero__count">
                <span className="hero__number">{total}</span>
                <span className="hero__unit">{total === 1 ? 'card' : 'cards'}</span>
              </div>
              <p className="hero__meta">
                {queue.reviewCount} {queue.reviewCount === 1 ? 'revisão' : 'revisões'} · {queue.newCount} {queue.newCount === 1 ? 'novo' : 'novos'} · cerca de {queue.estimatedMinutes} min
              </p>
              <Link to="/study" className="btn btn--primary btn--block">
                Estudar agora <Icon name="arrow-right" size={18} />
              </Link>
            </>
          ) : decks.length === 0 ? (
            <>
              <p className="hero__empty">Crie teu primeiro baralho para começar.</p>
              <button type="button" className="btn btn--primary btn--block" onClick={() => setSheet(true)}>
                Criar baralho
              </button>
            </>
          ) : (
            <>
              <p className="hero__empty">Tudo em dia por hoje.</p>
              <Link to="/card/new" className="btn btn--secondary btn--block">Criar cards</Link>
            </>
          )}
        </div>
      </section>

      {decks.length > 0 && (
        <>
          <div className="row-between">
            <h2 className="title-serif section-title">Baralhos</h2>
            <button type="button" className="link-btn" onClick={() => setSheet(true)}>+ Novo baralho</button>
          </div>
          <div className="list">
            {decks.map((d) => <DeckRow key={d.deck.id} overview={d} />)}
          </div>
        </>
      )}

      <DeckSheet open={sheet} onClose={closeSheet} />
      <TabBar />
    </main>
  );
}
