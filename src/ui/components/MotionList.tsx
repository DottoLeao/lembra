import { AnimatePresence, motion } from 'motion/react';
import { Children, createContext, isValidElement, useContext, useEffect, useRef, useState, type ReactNode, type Ref, type RefObject } from 'react';

const STAGGER = 0.03;
const MAX_STAGGERED = 8;

interface ListState {
  mounted: RefObject<boolean>;
  /** Muda só quando entram ou saem itens: é quando vale medir o layout de novo. */
  keys: string;
}

const ListContext = createContext<ListState>({ mounted: { current: true }, keys: '' });

/** Lista cujos itens entram em cascata só na primeira montagem e, ao sair, deixam os de baixo subirem. */
export function MotionList({ className = 'list', children }: { className?: string; children: ReactNode }) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const keys = Children.toArray(children).map((c) => (isValidElement(c) ? String(c.key) : '')).join('|');
  return (
    <ListContext.Provider value={{ mounted, keys }}>
      <div className={className}>
        <AnimatePresence mode="popLayout">{children}</AnimatePresence>
      </div>
    </ListContext.Provider>
  );
}

export function MotionItem({ index, children, ref }: { index: number; children: ReactNode; ref?: Ref<HTMLDivElement> }) {
  const { mounted, keys } = useContext(ListContext);
  // itens que chegam depois (ex.: ao limpar a busca) aparecem direto, sem cascata
  const [entering] = useState(() => !mounted.current);
  return (
    <motion.div ref={ref} layout="position" layoutDependency={keys}
      initial={entering ? { opacity: 0, y: 8 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      transition={{
        duration: 0.24, ease: 'easeOut', delay: entering ? Math.min(index, MAX_STAGGERED - 1) * STAGGER : 0,
        layout: { type: 'spring', stiffness: 380, damping: 34 },
      }}>
      {children}
    </motion.div>
  );
}
