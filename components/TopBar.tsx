'use client';

import { useEffect, useRef } from 'react';
import { useMahjongStore } from '@/store/mahjongStore';

interface TopBarProps {
  onProClick: () => void;
}

export default function TopBar({ onProClick }: TopBarProps) {
  const tiles          = useMahjongStore((s) => s.tiles);
  const initBoard      = useMahjongStore((s) => s.initBoard);
  const isComplete     = useMahjongStore((s) => s.isComplete);
  const elapsedSeconds = useMahjongStore((s) => s.elapsedSeconds);
  const tickSecond     = useMahjongStore((s) => s.tickSecond);

  const idleCount = tiles.filter((t) => t.state === 'idle' || t.state === 'selected').length;
  const pairsLeft = Math.floor(idleCount / 2);

  // ---------------------------------------------------------------------------
  // Drive the store timer from a single interval owned by the TopBar.
  // Using the store means WinModal and other components can read elapsedSeconds
  // directly without prop-drilling.
  // ---------------------------------------------------------------------------
  const boardSig    = tiles.reduce((acc, t) => acc + t.id, 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isComplete) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(tickSecond, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // boardSig ensures the interval restarts when the board resets
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, boardSig, tickSecond]);

  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const ss = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <header className="
      w-full flex items-center justify-between
      px-6 py-3
      bg-white/70 dark:bg-slate-900/70
      backdrop-blur-md
      border-b border-slate-200 dark:border-slate-700
      sticky top-0 z-50
    ">
      {/* Brand */}
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Mahjong
        </span>
        <span className="text-lg font-light text-amber-500">Flow</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-8">
        <Stat label="Time" value={`${mm}:${ss}`} />
        <Stat
          label="Pairs"
          value={isComplete ? '✦ Done' : String(pairsLeft)}
          highlight={isComplete}
        />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Pro upgrade */}
        <button
          onClick={onProClick}
          className="
            px-3 py-1.5 rounded-full text-xs font-semibold
            bg-amber-400/10 hover:bg-amber-400/20
            dark:bg-amber-500/10 dark:hover:bg-amber-500/20
            text-amber-600 dark:text-amber-400
            border border-amber-300/50 dark:border-amber-600/40
            active:scale-95 transition-all duration-150
          "
        >
          ✦ Pro
        </button>

        {/* Shuffle / new game */}
        <button
          onClick={() => initBoard()}
          className="
            px-4 py-1.5 rounded-full text-sm font-medium
            border border-slate-300 dark:border-slate-600
            text-slate-600 dark:text-slate-300
            hover:bg-slate-100 dark:hover:bg-slate-800
            active:scale-95 transition-all duration-150
          "
        >
          ↺ Shuffle
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
      <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          highlight ? 'text-amber-500' : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
