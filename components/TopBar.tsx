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

  const boardSig    = tiles.reduce((acc, t) => acc + t.id, 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isComplete) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(tickSecond, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, boardSig, tickSecond]);

  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const ss = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <header className="
      w-full flex items-center justify-between
      px-6 py-3
      bg-slate-950/80 backdrop-blur-xl
      border-b border-slate-800/80
      sticky top-0 z-50
    ">
      {/* Brand */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tracking-tight text-slate-100">
          Mahjong
        </span>
        <span className="text-lg font-light text-teal-400">Flow</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-8">
        <Stat label="Time"  value={`${mm}:${ss}`} />
        <Stat
          label="Pairs"
          value={isComplete ? '✦ Done' : String(pairsLeft)}
          highlight={isComplete}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Pro — turquoise neon glow */}
        <button
          onClick={onProClick}
          style={{ boxShadow: '0 0 15px rgba(45,212,191,0.4)' }}
          className="
            px-3 py-1.5 rounded-full text-xs font-semibold
            bg-teal-500/10 hover:bg-teal-500/20
            text-teal-300 border border-teal-500/40 hover:border-teal-400/70
            active:scale-95 transition-all duration-150
          "
        >
          ✦ Pro
        </button>

        {/* Shuffle */}
        <button
          onClick={() => initBoard()}
          className="
            px-4 py-1.5 rounded-full text-sm font-medium
            border border-slate-700 hover:border-slate-600
            text-slate-400 hover:text-slate-200
            hover:bg-slate-800/60
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
      <span className="text-[10px] uppercase tracking-widest text-slate-600">
        {label}
      </span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          highlight ? 'text-teal-400' : 'text-slate-200'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
