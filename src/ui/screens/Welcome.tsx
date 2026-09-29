import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { updateSettings } from '../../data/settings';
import { AnswerButtons } from '../components/AnswerButtons';
import { FlipCard } from '../components/FlipCard';
import { Icon } from '../components/Icon';

const MINUTE_OPTIONS = [5, 10, 15];

function ForgettingCurve() {
  return (
    <svg className="curve" viewBox="0 0 320 200" role="img"
      aria-label="Curva do esquecimento: sem revisão a lembrança cai rápido; com revisões ela cai cada vez mais devagar">
      <line x1="24" y1="176" x2="304" y2="176" stroke="#D5CBB9" strokeWidth="2" />
      <line x1="24" y1="16" x2="24" y2="176" stroke="#D5CBB9" strokeWidth="2" />
      <path d="M24 24 C 60 120, 110 160, 300 170" fill="none" stroke="#D5CBB9" strokeWidth="3" strokeDasharray="6 6" />
      <path d="M24 24 C 40 70, 60 90, 70 96 L 70 24 C 95 60, 120 76, 140 80 L 140 24 C 175 48, 215 58, 240 60 L 240 24 C 265 34, 290 40, 304 42"
        fill="none" stroke="#B5482A" strokeWidth="3.5" strokeLinejoin="round" />
      {[70, 140, 240].map((x) => <circle key={x} cx={x} cy="24" r="6" fill="#1E1A16" />)}
      <text x="30" y="194" fontSize="12" fill="#6B6259">tempo →</text>
    </svg>
  );
}

export default function Welcome() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const again = params.get('again') === '1';
  const [step, setStep] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [minutes, setMinutes] = useState(10);

  async function finish(createDeck: boolean) {
    await updateSettings({ onboardedAt: Date.now(), ...(createDeck ? { minutesPerDay: minutes } : {}) });
    if (again) navigate('/settings', { replace: true });
    else navigate(createDeck ? '/?newDeck=1' : '/', { replace: true });
  }

  const slides = [
    {
      title: 'Estude menos, lembre mais.',
      visual: <ForgettingCurve />,
      body: (
        <p className="welcome__text">
          A gente esquece rápido. Cada revisão na hora certa deixa o esquecimento mais lento. O Lembra revisa cada coisa
          pouco antes de você esquecer.
        </p>
      ),
    },
    {
      title: 'Tente lembrar antes de virar.',
      visual: (
        <FlipCard front="Qual é a capital da Austrália?" back="Canberra" flipped={flipped}
          onFlip={() => setFlipped(true)} onSwipe={() => setFlipped(false)} />
      ),
      body: <p className="welcome__text">Puxar a resposta da memória fixa muito mais do que reler. Toque no card.</p>,
    },
    {
      title: 'Diga como foi.',
      visual: (
        <div style={{ margin: 'auto 0', width: '100%' }}>
          <AnswerButtons onAnswer={() => {}} />
        </div>
      ),
      body: (
        <>
          <p className="welcome__text">Acertou? O card volta daqui a dias, depois semanas. Errou? Volta logo.</p>
          <p className="welcome__note">
            Repetição espaçada e recordação ativa estão entre as técnicas de estudo com mais evidência
            (Dunlosky et al., 2013).
          </p>
        </>
      ),
    },
    {
      title: 'Pouco, todo dia.',
      visual: (
        <ul className="welcome__tips" style={{ margin: 'auto 0' }}>
          <li><Icon name="check" size={20} stroke={2.4} /> Uma ideia por card.</li>
          <li><Icon name="check" size={20} stroke={2.4} /> Alguns minutos por dia valem mais que horas de vez em quando.</li>
        </ul>
      ),
      body: again ? null : (
        <div className="stack">
          <span className="field">Quanto tempo por dia?</span>
          <div className="choice">
            {MINUTE_OPTIONS.map((m) => (
              <button key={m} type="button" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} min</button>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const last = step === slides.length - 1;
  const slide = slides[step];

  return (
    <main className="welcome">
      <div className="welcome__top">
        <div className="welcome__dots" aria-label={`Passo ${step + 1} de ${slides.length}`}>
          {slides.map((_, i) => (
            <span key={i} className={i === step ? 'welcome__dot welcome__dot--active' : 'welcome__dot'} />
          ))}
        </div>
        {!last && <button type="button" className="link-btn" onClick={() => void finish(false)}>Pular</button>}
      </div>

      <AnimatePresence mode="wait">
        <motion.section key={step} className="welcome__slide" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
          <div className="welcome__visual">{slide.visual}</div>
          <h1 className="welcome__title">{slide.title}</h1>
          {slide.body}
        </motion.section>
      </AnimatePresence>

      {last ? (
        <button type="button" className="btn btn--primary btn--block" onClick={() => void finish(!again)}>
          {again ? 'Voltar aos ajustes' : 'Criar meu primeiro baralho'}
        </button>
      ) : (
        <button type="button" className="btn btn--primary btn--block" onClick={() => setStep((s) => s + 1)}>Continuar</button>
      )}
    </main>
  );
}
