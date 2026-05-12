'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Modal from './Modal';
import { useMahjongStore } from '@/store/mahjongStore';

interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewLeaderboard: () => void;
  elapsedSeconds: number;
}

function computeScore(seconds: number): number {
  return Math.max(0, 10_000 - seconds * 5);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0
    ? `${m}m ${String(s).padStart(2, '0')}s`
    : `${s}s`;
}

// ---------------------------------------------------------------------------
// Floating particle — pure CSS animation, no canvas needed
// ---------------------------------------------------------------------------

function Particle({ symbol, style }: { symbol: string; style: React.CSSProperties }) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -80, scale: 0.4 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="absolute text-base pointer-events-none select-none"
      style={style}
    >
      {symbol}
    </motion.span>
  );
}

const SYMBOLS = ['✦', '◇', '◎', '△', '○', '◈', '✧', '▷'];

export default function WinModal({
  isOpen,
  onClose,
  onViewLeaderboard,
  elapsedSeconds,
}: WinModalProps) {
  const initBoard  = useMahjongStore((s) => s.initBoard);
  const gameMode   = useMahjongStore((s) => s.gameMode);
  const score      = computeScore(elapsedSeconds);
  const time       = formatTime(elapsedSeconds);

  // Generate particle positions once when modal opens
  const particlesRef = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      symbol: SYMBOLS[i % SYMBOLS.length],
      left: `${Math.round(5 + (i / 18) * 90)}%`,
      top: `${Math.round(20 + Math.random() * 50)}%`,
      color: i % 3 === 0 ? '#f59e0b' : i % 3 === 1 ? '#818cf8' : '#34d399',
      delay: (i * 0.07).toFixed(2),
    })),
  );

  function handlePlayAgain() {
    initBoard(gameMode);
    onClose();
  }

  // Re-generate particles on re-open would require state; ref is intentionally
  // stable — same positions are fine for repeated wins.

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} maxWidth="max-w-sm">
      <div className="relative overflow-hidden">
        {/* Particles */}
        {isOpen &&
          particlesRef.current.map((p) => (
            <Particle
              key={p.id}
              symbol={p.symbol}
              style={{
                left: p.left,
                top: p.top,
                color: p.color,
                animationDelay: `${p.delay}s`,
              }}
            />
          ))}

        {/* Ambient gradient glow */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br
                     from-amber-50/60 to-violet-50/60
                     dark:from-amber-900/10 dark:to-violet-900/10
                     pointer-events-none"
        />

        {/* Content */}
        <div className="relative px-6 pt-10 pb-7 flex flex-col items-center text-center gap-5">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
            className="text-5xl"
          >
            ✦
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">
              {gameMode === 'daily' ? 'Daily Challenge Complete' : 'Board Cleared'}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              You're in flow.
            </h2>
          </motion.div>

          {/* Score cards */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
            className="flex gap-3 w-full"
          >
            <ScoreCard label="Time" value={time} />
            <ScoreCard
              label="Score"
              value={score.toLocaleString()}
              accent
            />
          </motion.div>

          {/* Performance band */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-xs text-slate-400 dark:text-slate-500"
          >
            {score >= 9_000
              ? 'Exceptional — top-tier focus.'
              : score >= 7_500
              ? 'Great session. Your flow is building.'
              : score >= 5_000
              ? 'Solid run. Room to sharpen your line.'
              : 'Every game teaches something new.'}
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="flex flex-col gap-2.5 w-full"
          >
            {gameMode === 'daily' && (
              <button
                onClick={onViewLeaderboard}
                className="
                  w-full py-2.5 rounded-xl text-sm font-medium
                  bg-amber-400 hover:bg-amber-500 active:bg-amber-600
                  dark:bg-amber-500 dark:hover:bg-amber-400
                  text-white shadow-lg shadow-amber-400/25
                  transition-all duration-150 active:scale-[0.98]
                "
              >
                ✦ View Daily Leaderboard
              </button>
            )}

            <button
              onClick={handlePlayAgain}
              className="
                w-full py-2.5 rounded-xl text-sm font-medium
                border border-slate-200 dark:border-slate-700
                text-slate-600 dark:text-slate-300
                hover:bg-slate-50 dark:hover:bg-slate-800
                transition-all duration-150 active:scale-[0.98]
              "
            >
              ↺ Play Again
            </button>
          </motion.div>

          {/* Upgrade nudge for long sessions */}
          {elapsedSeconds > 600 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-[11px] text-slate-400 dark:text-slate-500"
            >
              Track this session in your focus history.{' '}
              <button
                onClick={onClose}
                className="text-amber-500 hover:underline"
              >
                Upgrade to Pro →
              </button>
            </motion.p>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function ScoreCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p
        className={`text-lg font-semibold tabular-nums mt-0.5 ${
          accent ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
