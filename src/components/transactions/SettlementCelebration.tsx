import { Beer, Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';

type SettlementCelebrationProps = {
  friendName: string;
  quantityLabel: string;
  onComplete: () => void;
};

const BUBBLES = [
  { x: -92, y: -116, size: 9, delay: 0.08 },
  { x: -55, y: -148, size: 13, delay: 0.16 },
  { x: -15, y: -126, size: 7, delay: 0.03 },
  { x: 30, y: -154, size: 11, delay: 0.2 },
  { x: 72, y: -120, size: 8, delay: 0.11 },
  { x: 98, y: -160, size: 12, delay: 0.24 },
] as const;

export function SettlementCelebration({
  friendName,
  quantityLabel,
  onComplete,
}: SettlementCelebrationProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(onComplete, reduceMotion ? 1200 : 2400);
    return () => window.clearTimeout(timer);
  }, [onComplete, reduceMotion]);

  return (
    <motion.div
      className="settlement-celebration"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.18 }}
    >
      <motion.div
        className="settlement-celebration__card"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.82, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={{ duration: reduceMotion ? 0.12 : 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="settlement-celebration__clink" aria-hidden="true">
          <motion.span
            initial={reduceMotion ? false : { x: -34, rotate: -18 }}
            animate={{ x: -7, rotate: -7 }}
            transition={{ delay: 0.12, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <Beer size={42} />
          </motion.span>
          <motion.span
            initial={reduceMotion ? false : { x: 34, rotate: 18 }}
            animate={{ x: 7, rotate: 7 }}
            transition={{ delay: 0.12, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <Beer size={42} />
          </motion.span>
          {!reduceMotion &&
            BUBBLES.map((bubble) => (
              <motion.i
                key={`${bubble.x}-${bubble.y}`}
                style={{ width: bubble.size, height: bubble.size }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                animate={{
                  x: bubble.x,
                  y: bubble.y,
                  opacity: [0, 0.9, 0],
                  scale: [0.5, 1, 0.8],
                }}
                transition={{ delay: bubble.delay + 0.2, duration: 0.9, ease: 'easeOut' }}
              />
            ))}
        </div>
        <span className="settlement-celebration__check" aria-hidden="true">
          <Check size={18} strokeWidth={3} />
        </span>
        <h2>All square!</h2>
        <p>
          {quantityLabel} returned. You and {friendName} are even.
        </p>
      </motion.div>
    </motion.div>
  );
}
