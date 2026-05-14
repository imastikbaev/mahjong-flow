'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import Modal from './Modal';
import { useMahjongStore } from '@/store/mahjongStore';

// ---------------------------------------------------------------------------

export type ResultStatus = 'win' | 'fail';

interface ResultModalProps {
  isOpen:            boolean;
  onClose:           () => void;
  onViewLeaderboard: () => void;
  elapsedSeconds:    number;
  status:            ResultStatus;
}

function computeScore(seconds: number): number {
  return Math.max(0, 10_000 - seconds * 5);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

// ---------------------------------------------------------------------------

const PARTICLE_SYMBOLS = ['✦', '◇', '◎', '△', '○', '◈', '✧', '▷'];

function Particle({ symbol, style }: { symbol: string; style: React.CSSProperties }) {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0.6, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -72, scale: 0.3 }}
      transition={{ duration: 1.4, ease: 'easeOut' }}
      className="absolute text-sm pointer-events-none select-none text-neutral-600"
      style={style}
    >
      {symbol}
    </motion.span>
  );
}

// ---------------------------------------------------------------------------

export default function ResultModal({
  isOpen,
  onClose,
  onViewLeaderboard,
  elapsedSeconds,
  status,
}: ResultModalProps) {
  const initBoard         = useMahjongStore((s) => s.initBoard);
  const gameMode          = useMahjongStore((s) => s.gameMode);
  const sprintMode        = useMahjongStore((s) => s.sprintMode);
  const sprintSecondsLeft = useMahjongStore((s) => s.sprintSecondsLeft);
  const tiles             = useMahjongStore((s) => s.tiles);

  const isWin        = status === 'win';
  const pairsMatched = Math.floor(tiles.filter((t) => t.state === 'matched').length / 2);
  const sprintScore  = pairsMatched * 100 + sprintSecondsLeft * 10;
  const score        = sprintMode ? sprintScore : computeScore(elapsedSeconds);
  const time         = formatTime(elapsedSeconds);

  const particlesRef = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      id:     i,
      symbol: PARTICLE_SYMBOLS[i % PARTICLE_SYMBOLS.length],
      left:   `${Math.round(4 + (i / 16) * 92)}%`,
      top:    `${Math.round(15 + (i % 5) * 12)}%`,
      delay:  `${(i * 0.06).toFixed(2)}s`,
    })),
  );

  function handlePlayAgain() {
    initBoard(gameMode);
    onClose();
  }

  // ── Performance label ─────────────────────────────────────────────────────
  const perfLabel = !isWin
    ? `${pairsMatched} pair${pairsMatched !== 1 ? 's' : ''} cleared before time ran out.`
    : score >= 9_000 ? 'Exceptional — top-tier focus.'
    : score >= 7_500 ? 'Great session. Your flow is building.'
    : score >= 5_000 ? 'Solid run. Room to sharpen your line.'
    : 'Every game teaches something new.';

  // ── Header copy ────────────────────────────────────────────────────────────
  const modeLabel = !isWin
    ? 'Sprint ended'
    : sprintMode
    ? 'Sprint complete'
    : gameMode === 'daily'
    ? 'Daily challenge complete'
    : 'Board cleared';

  const headline = isWin ? "You're in flow." : "Time's up.";

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop={false} maxWidth="max-w-sm">
      <div className="relative overflow-hidden bg-white dark:bg-[#0e0e0e]">

        {/* Particles — only on win to avoid celebrating failure */}
        {isOpen && isWin && particlesRef.current.map((p) => (
          <Particle key={p.id} symbol={p.symbol} style={{ left: p.left, top: p.top, animationDelay: p.delay }} />
        ))}

        {/* Radial glow */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
        />

        {/* Header stripe */}
        <div className="px-6 pt-8 pb-0 border-b border-black/[0.06] dark:border-white/[0.06]">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.08 }}
            className="flex justify-center mb-5 text-4xl text-neutral-700 dark:text-neutral-200"
          >
            {isWin ? '✦' : '◎'}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.28 }}
            className="text-center pb-5"
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-600 font-normal mb-1.5">
              {modeLabel}
            </p>
            <h2 className="text-2xl font-light tracking-tight text-neutral-900 dark:text-neutral-100">
              {headline}
            </h2>
          </motion.div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col items-center gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.28 }}
            className="flex gap-2.5 w-full"
          >
            {sprintMode
              ? <ScoreCard label="Pairs" value={`${pairsMatched} / 72`} />
              : <ScoreCard label="Time"  value={time} />}
            <ScoreCard label="Score" value={score.toLocaleString()} highlight />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
            className="text-xs font-light text-neutral-500 tracking-tight text-center"
          >
            {perfLabel}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48, duration: 0.28 }}
            className="flex flex-col gap-2 w-full"
          >
            {isWin && gameMode === 'daily' && (
              <button
                onClick={onViewLeaderboard}
                className="
                  w-full py-2.5 rounded-lg text-sm font-normal tracking-tight
                  bg-neutral-900 dark:bg-white hover:bg-neutral-700 dark:hover:bg-neutral-100
                  text-white dark:text-[#0a0a0a] transition-colors duration-150 active:scale-[0.98]
                "
              >
                ◎ View Leaderboard
              </button>
            )}

            <button
              onClick={handlePlayAgain}
              className="
                w-full py-2.5 rounded-lg text-sm font-normal tracking-tight
                bg-black/[0.04] dark:bg-white/[0.04] hover:bg-black/[0.07] dark:hover:bg-white/[0.07]
                border border-black/[0.08] dark:border-white/[0.08]
                hover:border-black/[0.14] dark:hover:border-white/[0.14]
                text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100
                transition-all duration-150 active:scale-[0.98]
              "
            >
              ↺ Play Again
            </button>
          </motion.div>

          {isWin && elapsedSeconds > 600 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="text-[11px] font-light text-neutral-500 dark:text-neutral-700 tracking-tight text-center"
            >
              Track sessions in your focus history.{' '}
              <button
                onClick={onClose}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors duration-150"
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
  highlight = false,
}: {
  label:     string;
  value:     string;
  highlight?: boolean;
}) {
  return (
    <div className="flex-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.07] px-4 py-3">
      <p className="text-[9px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-600 font-normal">
        {label}
      </p>
      <p className={`text-lg font-light tabular-nums tracking-tight mt-0.5 ${
        highlight ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-500 dark:text-neutral-400'
      }`}>
        {value}
      </p>
    </div>
  );
}
