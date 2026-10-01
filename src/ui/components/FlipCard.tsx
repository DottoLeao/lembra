import { motion, useIsPresent, useMotionValue, useTransform, type Variants } from 'motion/react';
import { useState, type Ref } from 'react';

export const SWIPE_THRESHOLD = 100;

/** Para onde o card respondido sai: direita para Bom/Fácil, esquerda para Errei/Difícil. */
export type ExitDirection = 'left' | 'right' | null;

const cardVariants: Variants = {
  enter: { opacity: 0, scale: 0.96 },
  center: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 34 } },
  exit: (dir: ExitDirection) => ({
    opacity: 0,
    x: dir === 'right' ? 400 : dir === 'left' ? -400 : 0,
    rotate: dir === 'right' ? 8 : dir === 'left' ? -8 : 0,
    transition: { duration: 0.25, ease: 'easeIn' },
  }),
};

export function FlipCard({ front, back, flipped, onFlip, onSwipe, ref }: {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (dir: 'left' | 'right') => void;
  ref?: Ref<HTMLDivElement>;
}) {
  const x = useMotionValue(0);
  const tilt = useTransform(x, [-200, 200], [-8, 8]);
  const [dragHint, setDragHint] = useState<'left' | 'right' | null>(null);
  // o card que está saindo não aceita toque nem arrasto
  const isPresent = useIsPresent();

  return (
    <motion.div ref={ref} className="flip" variants={cardVariants} initial="enter" animate="center" exit="exit"
      inert={!isPresent} aria-hidden={isPresent ? undefined : true}>
      <motion.div
        className="flip__drag"
        style={{ x, rotate: tilt }}
        drag={flipped ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.9}
        onDrag={(_, info) => setDragHint(info.offset.x > 40 ? 'right' : info.offset.x < -40 ? 'left' : null)}
        onDragEnd={(_, info) => {
          setDragHint(null);
          if (info.offset.x > SWIPE_THRESHOLD) onSwipe('right');
          else if (info.offset.x < -SWIPE_THRESHOLD) onSwipe('left');
        }}
      >
        <motion.div
          className="flip__inner"
          initial={false}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.75, 0.25, 1] }}
        >
          <button type="button" className="flip__face ruled" onClick={onFlip} disabled={flipped} tabIndex={flipped ? -1 : 0}>
            <span className="label">Pergunta</span>
            <span className="flip__text"><span>{front}</span></span>
            <span className="flip__hint">Toque para virar</span>
          </button>
          <div className="flip__face flip__face--back ruled" aria-hidden={!flipped}>
            <span className="label">Resposta</span>
            <span className="flip__question">{front}</span>
            <span className="flip__answer">{back}</span>
            {dragHint && (
              <span className={`flip__drag-hint flip__drag-hint--${dragHint}`}>{dragHint === 'right' ? 'Bom' : 'Errei'}</span>
            )}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
