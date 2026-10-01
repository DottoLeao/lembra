import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect } from 'react';

/** Conta de 0 até o valor; com reduzir movimento mostra o valor direto. O texto final é sempre o valor exato. */
export function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const count = useMotionValue(reduce ? value : 0);
  const shown = useTransform(() => Math.round(count.get()));

  useEffect(() => {
    if (reduce) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 0.6, ease: 'easeOut' });
    return () => controls.stop();
  }, [count, value, reduce]);

  return <motion.span>{shown}</motion.span>;
}
