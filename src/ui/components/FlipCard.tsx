import { motion, useMotionValue, useTransform } from 'motion/react';
import { useState } from 'react';

export const SWIPE_THRESHOLD = 100;

export function FlipCard({ front, back, flipped, onFlip, onSwipe }: {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
  onSwipe: (dir: 'left' | 'right') => void;
}) {
  const x = useMotionValue(0);
  const tilt = useTransform(x, [-200, 200], [-8, 8]);
  const [dragHint, setDragHint] = useState<'left' | 'right' | null>(null);

  return (
    <div className="flip">
      <motion.div
        className="flip__drag"
        style={{ x, rotate: tilt }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
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
    </div>
  );
}
