'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMahjongStore } from '@/store/mahjongStore';

/**
 * Non-blocking toast shown when the solvable board generator exhausted all
 * retry attempts and fell back to a pure shuffle.
 *
 * This situation is statistically extremely rare (~0%) but the engine
 * guarantees correctness by always giving the player a board — honesty
 * requires surfacing the caveat.
 *
 * Dismisses automatically after 8 seconds or on manual close.
 */
export default function UnsolvableToast() {
  const isUnsolvableWarning = useMahjongStore((s) => s.isUnsolvableWarning);
  const reshuffleRemaining  = useMahjongStore((s) => s.reshuffleRemaining);
  const dismissUnsolvable   = useMahjongStore((s) => s.dismissUnsolvable);

  // Auto-dismiss after 8 s
  useEffect(() => {
    if (!isUnsolvableWarning) return;
    const t = setTimeout(dismissUnsolvable, 8_000);
    return () => clearTimeout(t);
  }, [isUnsolvableWarning, dismissUnsolvable]);

  function handleReshuffle() {
    reshuffleRemaining();
    dismissUnsolvable();
  }

  return (
    <AnimatePresence>
      {isUnsolvableWarning && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22 }}
          className="
            fixed bottom-20 left-1/2 -translate-x-1/2 z-50
            flex items-center gap-3
            px-4 py-3 rounded-xl
            bg-white dark:bg-[#111111]
            border border-black/[0.1] dark:border-white/[0.08]
            shadow-lg shadow-black/[0.06] dark:shadow-black/[0.4]
            text-sm font-light tracking-tight
            text-neutral-700 dark:text-neutral-300
            max-w-sm w-[calc(100%-2rem)]
          "
        >
          <span className="text-amber-500 shrink-0">◎</span>

          <span className="flex-1 text-xs leading-relaxed">
            Board generated without a solve guarantee — layout may be unwinnable.
          </span>

          <button
            onClick={handleReshuffle}
            className="
              shrink-0 text-xs px-2.5 py-1 rounded-lg
              bg-neutral-100 dark:bg-white/[0.07]
              hover:bg-neutral-200 dark:hover:bg-white/[0.12]
              text-neutral-700 dark:text-neutral-300
              transition-colors duration-150
            "
          >
            Reshuffle
          </button>

          <button
            onClick={dismissUnsolvable}
            aria-label="Dismiss"
            className="shrink-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors duration-150 leading-none"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
