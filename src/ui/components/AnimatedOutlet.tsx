import { AnimatePresence, motion, useIsPresent, useReducedMotion, type Variants } from 'motion/react';
import { useContext, useRef, useState, type ReactNode, type Ref } from 'react';
import { matchPath, UNSAFE_LocationContext, useLocation, useNavigationType, useOutlet, type NavigationType } from 'react-router';
import { TabBar } from './TabBar';

/** Como a tela nova chega: sobe (foco), desce (sai do foco), vem da direita/esquerda ou troca de aba. */
type Move = 'focus-in' | 'focus-out' | 'forward' | 'back' | 'tab';

const FOCUS = ['/study', '/study/end', '/card/new', '/card/:id/edit', '/import', '/welcome', '/install'];
const TAB_ROOTS = ['/', '/decks'];

const isFocus = (path: string) => FOCUS.some((p) => matchPath(p, path));
const isDeck = (path: string) => matchPath('/deck/:id', path) !== null;
const hasTabBar = (path: string) => TAB_ROOTS.includes(path) || path === '/settings' || isDeck(path);

export function moveFor(from: string, to: string, type: NavigationType): Move {
  if (isFocus(to)) return 'focus-in';
  if (isFocus(from)) return 'focus-out';
  if (isDeck(to) && TAB_ROOTS.includes(from)) return type === 'POP' ? 'back' : 'forward';
  if (isDeck(from) && TAB_ROOTS.includes(to)) return 'back';
  return 'tab';
}

const spring = { type: 'spring', stiffness: 380, damping: 34 } as const;
const enterTransition = { default: spring, opacity: { duration: 0.22, ease: 'easeOut' } } as const;
const exitTransition = { duration: 0.18, ease: 'easeIn' } as const;

const variants: Variants = {
  enter: (move: Move) => ({
    opacity: 0,
    x: move === 'forward' ? 40 : move === 'back' ? -40 : 0,
    y: move === 'focus-in' ? 24 : move === 'tab' ? 8 : 0,
  }),
  center: { opacity: 1, x: 0, y: 0, transition: enterTransition },
  exit: (move: Move) => ({
    opacity: 0,
    x: move === 'forward' ? -40 : move === 'back' ? 40 : 0,
    y: move === 'focus-out' ? 24 : 0,
    transition: exitTransition,
  }),
};

/**
 * Uma camada de tela. Enquanto sai, fica inerte e congela a localização em que foi montada,
 * para não reagir à URL da tela nova (ex.: o Fim da sessão redirecionaria sem o state).
 */
function RouteLayer({ move, children, ref }: { move: Move; children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  const isPresent = useIsPresent();
  const live = useContext(UNSAFE_LocationContext);
  const last = useRef(live);
  if (isPresent) last.current = live;
  return (
    <motion.div ref={ref} className="route" custom={move} variants={variants} initial="enter" animate="center" exit="exit"
      inert={!isPresent} aria-hidden={isPresent ? undefined : true} style={isPresent ? undefined : { pointerEvents: 'none' }}>
      <UNSAFE_LocationContext.Provider value={isPresent ? live : last.current}>{children}</UNSAFE_LocationContext.Provider>
    </motion.div>
  );
}

export function AnimatedOutlet() {
  const { pathname } = useLocation();
  const type = useNavigationType();
  const outlet = useOutlet();
  const reduce = useReducedMotion();
  const [nav, setNav] = useState<{ path: string; move: Move }>({ path: pathname, move: 'tab' });
  if (nav.path !== pathname) setNav({ path: pathname, move: moveFor(nav.path, pathname, type) });
  const deckId = matchPath('/deck/:id', pathname)?.params.id;

  return (
    <>
      <div className="route-stage">
        {reduce ? (
          <div className="route">{outlet}</div>
        ) : (
          <AnimatePresence mode="popLayout" initial={false} custom={nav.move}>
            <RouteLayer key={pathname} move={nav.move}>{outlet}</RouteLayer>
          </AnimatePresence>
        )}
      </div>
      {hasTabBar(pathname) && <TabBar createHref={deckId ? `/card/new?deck=${deckId}` : undefined} />}
    </>
  );
}
