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

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Pro — ghost button, no glow */}
        <button
          onClick={onProClick}
          className="
            px-3 py-1.5 rounded-md text-xs font-normal tracking-tight
            border border-white/[0.1] hover:border-white/[0.2]
            text-neutral-400 hover:text-neutral-200
            hover:bg-white/[0.04]
            transition-all duration-200 ease-out
            active:scale-95
          "
        >
          Pro
        </button>

        {/* Shuffle — text-only */}
        <button
          onClick={() => initBoard()}
          className="
            px-3 py-1.5 rounded-md text-xs font-normal tracking-tight
            text-neutral-600 hover:text-neutral-300
            hover:bg-white/[0.03]
            transition-all duration-200 ease-out
            active:scale-95
          "
        >
          Shuffle
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
