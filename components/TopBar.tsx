'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useMahjongStore, hasAvailableMoves } from '@/store/mahjongStore';

interface TopBarProps {
  onProClick: () => void;
}

export default function TopBar({ onProClick }: TopBarProps) {
  const tiles          = useMahjongStore((s) => s.tiles);
  const initBoard      = useMahjongStore((s) => s.initBoard);
  const isComplete     = useMahjongStore((s) => s.isComplete);
  const elapsedSeconds = useMahjongStore((s) => s.elapsedSeconds);
  const tickSecond     = useMahjongStore((s) => s.tickSecond);
  const isPro          = useMahjongStore((s) => s.isPro);
  const history        = useMahjongStore((s) => s.history);
  const undoMove       = useMahjongStore((s) => s.undoMove);
  const difficulty          = useMahjongStore((s) => s.difficulty);
  const setDifficulty       = useMahjongStore((s) => s.setDifficulty);
  const getHint             = useMahjongStore((s) => s.getHint);
  const hintedId            = useMahjongStore((s) => s.hintedId);
  const reshuffleRemaining  = useMahjongStore((s) => s.reshuffleRemaining);

  const hasIdle    = tiles.some((t) => t.state === 'idle');
  const isDeadlock = useMemo(
    () => hasIdle && !isComplete && !hasAvailableMoves(tiles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tiles, isComplete],
  );

  const idleCount = tiles.filter((t) => t.state === 'idle' || t.state === 'selected').length;
  const pairsLeft = Math.floor(idleCount / 2);

  const boardSig    = tiles.reduce((acc, t) => acc + t.id, 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isComplete) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(tickSecond, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, boardSig, tickSecond]);

  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const ss = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <header className="
      w-full flex items-center justify-between
      px-6 py-3.5
      bg-[#0a0a0a]/90 backdrop-blur-xl
      border-b border-white/[0.06]
      sticky top-0 z-50
    ">
      {/* Brand */}
      <div className="flex items-baseline gap-1">
        <span className="text-sm font-normal tracking-tight text-neutral-200">Mahjong</span>
        <span className="text-sm font-light tracking-tight text-neutral-500">Flow</span>
      </div>

      {/* Stats — centred, minimal */}
      <div className="flex items-center gap-10">
        <Stat label="time"  value={`${mm}:${ss}`} />
        <Stat
          label="pairs"
          value={isComplete ? '—' : String(pairsLeft)}
          highlight={isComplete}
        />
      </div>

      {/* Difficulty selector */}
      <div className="flex items-center rounded-md border border-white/[0.07] overflow-hidden">
        {(['easy', 'medium', 'hard'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={[
              'px-2.5 py-1.5 text-[10px] font-normal tracking-tight transition-colors duration-150',
              difficulty === d
                ? 'bg-white/[0.08] text-neutral-300'
                : 'text-neutral-700 hover:text-neutral-400',
            ].join(' ')}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Pro button — active state when isPro */}
        <button
          onClick={onProClick}
          className={[
            'px-3 py-1.5 rounded-md text-xs font-normal tracking-tight',
            'transition-all duration-200 ease-out active:scale-95',
            isPro
              ? 'border border-white/[0.15] text-neutral-200 bg-white/[0.06]'
              : 'border border-white/[0.1] hover:border-white/[0.2] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]',
          ].join(' ')}
        >
          {isPro ? 'Pro ✦' : 'Pro'}
        </button>

        {/* Hint */}
        <button
          onClick={getHint}
          className={[
            'px-3 py-1.5 rounded-md text-xs font-normal tracking-tight',
            'transition-all duration-200 ease-out active:scale-95',
            hintedId !== null
              ? 'text-neutral-300 bg-white/[0.05] border border-white/[0.12]'
              : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.03]',
          ].join(' ')}
          title="Show a hint"
        >
          ◎
        </button>

        {/* Undo — Pro only */}
        {isPro && (
          <button
            onClick={undoMove}
            disabled={history.length === 0}
            className="
              px-3 py-1.5 rounded-md text-xs font-normal tracking-tight
              text-neutral-600 hover:text-neutral-300
              hover:bg-white/[0.03]
              transition-all duration-200 ease-out
              active:scale-95
              disabled:opacity-20 disabled:cursor-not-allowed
            "
            title="Undo last match"
          >
            ↺
          </button>
        )}

        {/* Reshuffle — highlights on deadlock, starts new game otherwise */}
        <button
          onClick={isDeadlock ? reshuffleRemaining : () => initBoard()}
          title={isDeadlock ? 'No moves left — reshuffle remaining tiles' : 'New game'}
          className={[
            'px-3 py-1.5 rounded-md text-xs font-normal tracking-tight',
            'transition-all duration-200 ease-out active:scale-95',
            isDeadlock
              ? 'border border-white/[0.2] text-neutral-200 bg-white/[0.06] animate-pulse'
              : 'text-neutral-600 hover:text-neutral-300 hover:bg-white/[0.03]',
          ].join(' ')}
        >
          {isDeadlock ? '↺ stuck?' : 'shuffle'}
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] uppercase tracking-[0.12em] text-neutral-700 font-normal">
        {label}
      </span>
      <span
        className={`text-sm font-light tabular-nums tracking-tight ${
          highlight ? 'text-neutral-200' : 'text-neutral-400'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
