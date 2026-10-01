import { AnimatePresence, motion, useIsPresent, useReducedMotion, type PanInfo } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const CLOSE_OFFSET = 100;
const CLOSE_VELOCITY = 500;

export function BottomSheet({ open, title, onClose, children }: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  // presença da camada de tela (AnimatedOutlet): quando a tela sai, a folha sai junto,
  // já que o portal a tira de dentro da camada inerte
  const screenPresent = useIsPresent();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const sheet = open && screenPresent && <Sheet key="sheet" title={title} onClose={onClose}>{children}</Sheet>;
  // no portal, o transform da tela em transição não prende o position: fixed da folha
  return createPortal(reduce ? sheet : <AnimatePresence>{sheet}</AnimatePresence>, document.body);
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  // enquanto fecha, a folha não recebe toques nem aparece para leitores de tela
  const isPresent = useIsPresent();

  function onDragEnd(_: PointerEvent, info: PanInfo) {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) onClose();
  }

  return (
    <motion.div className="sheet-backdrop" onClick={onClose} inert={!isPresent} aria-hidden={isPresent ? undefined : true}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <motion.div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%', transition: { duration: 0.22, ease: 'easeIn' } }}
        transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={onDragEnd}>
        <div className="sheet__handle" />
        <h2 className="sheet__title">{title}</h2>
        {children}
      </motion.div>
    </motion.div>
  );
}
