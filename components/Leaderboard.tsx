'use client';

import { useState } from 'react';
import { useLeaderboard, LeaderboardScope } from '@/lib/hooks/useLeaderboard';
import { DAILY_DATE } from '@/store/mahjongStore';

interface LeaderboardProps {
  /** The viewer's city — used when toggling to Local scope. */
  userCity?: string | null;
}

export default function Leaderboard({ userCity }: LeaderboardProps) {
  const [scope, setScope] = useState<LeaderboardScope>('global');

  const { rows, loading, error, refetch } = useLeaderboard({
    date: DAILY_DATE,
    scope,
    city: userCity,
  });

  const canShowLocal = !!userCity;

  return (
    <aside className="
      w-full max-w-sm
      bg-white/80 dark:bg-slate-900/80
      backdrop-blur-md
      rounded-2xl
      border border-slate-200 dark:border-slate-700
      shadow-xl
      overflow-hidden
    ">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            Daily Challenge
          </h2>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {DAILY_DATE}
          </p>
        </div>

        {/* Scope toggle */}
        <div className="flex rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
          <ScopeButton
            label="Global"
            active={scope === 'global'}
            onClick={() => setScope('global')}
          />
          <ScopeButton
            label={userCity ?? 'Local'}
            active={scope === 'local'}
            disabled={!canShowLocal}
            onClick={() => canShowLocal && setScope('local')}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 dark:bg-slate-800" />

      {/* Body */}
      <div className="px-2 py-2 min-h-[200px]">
        {loading && <LoadingRows />}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-2xl">⚠</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
            <button
              onClick={refetch}
              className="text-xs text-amber-500 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-3xl opacity-30">◎</span>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {scope === 'local'
                ? `No scores from ${userCity} yet — be the first!`
                : 'No scores yet today — be the first!'}
            </p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <ol className="space-y-0.5">
            {rows.map((row, index) => (
              <LeaderboardRow key={row.id} row={row} rank={index + 1} />
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function LeaderboardRow({
  row,
  rank,
}: {
  row: import('@/lib/supabaseClient').LeaderboardRow;
  rank: number;
}) {
  const mm = String(Math.floor(row.time_seconds / 60)).padStart(2, '0');
  const ss = String(row.time_seconds % 60).padStart(2, '0');

  const rankLabel =
    rank === 1 ? '✦' : rank === 2 ? '◆' : rank === 3 ? '◇' : String(rank);

  const rankColor =
    rank === 1
      ? 'text-amber-400'
      : rank === 2
      ? 'text-slate-400'
      : rank === 3
      ? 'text-orange-400'
      : 'text-slate-400 dark:text-slate-500';

  return (
    <li className="
      flex items-center gap-3
      px-3 py-2 rounded-xl
      hover:bg-slate-50 dark:hover:bg-slate-800/60
      transition-colors
    ">
      {/* Rank */}
      <span className={`w-5 text-center text-sm font-semibold ${rankColor}`}>
        {rankLabel}
      </span>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {row.users.nickname}
        </p>
        {row.users.city && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
            {row.users.city}
          </p>
        )}
      </div>

      {/* Score + time */}
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
          {row.score.toLocaleString()}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">
          {mm}:{ss}
        </p>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function LoadingRows() {
  return (
    <div className="space-y-0.5 px-1 py-2 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2"
        >
          <div className="w-5 h-4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-2/3" />
            <div className="h-2 rounded bg-slate-100 dark:bg-slate-800 w-1/3" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 w-12" />
            <div className="h-2 rounded bg-slate-100 dark:bg-slate-800 w-10" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scope toggle button
// ---------------------------------------------------------------------------

function ScopeButton({
  label,
  active,
  disabled = false,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'px-3 py-1 text-[11px] font-medium transition-colors duration-150',
        active
          ? 'bg-amber-400 text-white dark:bg-amber-500'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
