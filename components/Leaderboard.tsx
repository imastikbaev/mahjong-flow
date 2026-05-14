'use client';

import { useState } from 'react';
import { useLeaderboard, LeaderboardScope } from '@/lib/hooks/useLeaderboard';
import { DAILY_DATE, useMahjongStore } from '@/store/mahjongStore';

interface LeaderboardProps {
  userCity?: string | null;
}

export default function Leaderboard({ userCity }: LeaderboardProps) {
  const [scope, setScope] = useState<LeaderboardScope>('global');
  const isPro = useMahjongStore((s) => s.isPro);

  const { rows, loading, error, refetch } = useLeaderboard({
    date: DAILY_DATE,
    scope,
    city: userCity,
  });

  // Pro users always see the local tab; free users need a city set
  const canShowLocal = isPro || !!userCity;

  return (
    <aside className="
      w-full max-w-sm
      bg-white dark:bg-white/[0.03] backdrop-blur-sm
      rounded-xl
      border border-black/[0.07] dark:border-white/[0.07]
      overflow-hidden
    ">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06]">
        <div>
          <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-600 font-normal mb-1">
            Daily Challenge
          </p>
          <p className="text-xs font-light text-neutral-500 tracking-tight">
            {DAILY_DATE}
          </p>
        </div>

        {/* Scope toggle */}
        <div className="flex rounded-md border border-black/[0.08] dark:border-white/[0.08] overflow-hidden text-[11px]">
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
            proLocked={!isPro && !userCity}
          />
        </div>
      </div>

      {/* Body */}
      <div className="px-2 py-2 min-h-[200px]">
        {loading && <LoadingRows />}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-xl text-neutral-400 dark:text-neutral-700">⚠</span>
            <p className="text-xs font-light text-neutral-500 dark:text-neutral-600">{error}</p>
            <button
              onClick={refetch}
              className="text-xs font-normal text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="text-2xl text-neutral-400 dark:text-neutral-700">◎</span>
            <p className="text-xs font-light text-neutral-500 dark:text-neutral-600 tracking-tight">
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
    rank <= 3 ? 'text-neutral-600 dark:text-neutral-300' : 'text-neutral-400 dark:text-neutral-600';

  return (
    <li className="
      flex items-center gap-3
      px-3 py-2 rounded-lg
      hover:bg-black/[0.03] dark:hover:bg-white/[0.03]
      transition-colors duration-150
    ">
      {/* Rank */}
      <span className={`w-5 text-center text-sm font-light shrink-0 ${rankColor}`}>
        {rankLabel}
      </span>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-normal text-neutral-700 dark:text-neutral-300 tracking-tight truncate">
          {row.users.nickname}
        </p>
        {row.users.city && (
          <p className="text-[10px] font-light text-neutral-500 dark:text-neutral-600 truncate">
            {row.users.city}
          </p>
        )}
      </div>

      {/* Score + time */}
      <div className="text-right shrink-0">
        <p className="text-sm font-normal text-neutral-700 dark:text-neutral-300 tabular-nums tracking-tight">
          {row.score.toLocaleString()}
        </p>
        <p className="text-[10px] font-light text-neutral-500 dark:text-neutral-600 tabular-nums">
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
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="w-5 h-3 rounded bg-black/[0.05] dark:bg-white/[0.05]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 rounded bg-black/[0.05] dark:bg-white/[0.05] w-2/3" />
            <div className="h-2 rounded bg-black/[0.03] dark:bg-white/[0.03] w-1/3" />
          </div>
          <div className="space-y-1.5 text-right">
            <div className="h-3 rounded bg-black/[0.05] dark:bg-white/[0.05] w-12" />
            <div className="h-2 rounded bg-black/[0.03] dark:bg-white/[0.03] w-10" />
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
  proLocked = false,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  proLocked?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={proLocked ? 'Geo Leaderboard — Pro feature' : undefined}
      className={[
        'px-3 py-1.5 text-[11px] font-normal tracking-tight transition-colors duration-150',
        active
          ? 'bg-black/[0.06] dark:bg-white/[0.08] text-neutral-800 dark:text-neutral-200'
          : 'text-neutral-500 dark:text-neutral-600 hover:text-neutral-800 dark:hover:text-neutral-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]',
        disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {proLocked ? `${label} ✦` : label}
    </button>
  );
}
