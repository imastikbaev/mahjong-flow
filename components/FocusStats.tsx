'use client';

import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

/**
 * Simulated 7-day history of average match-completion times (seconds).
 * Replace with real Supabase query once auth is wired:
 *   SELECT date, AVG(time_seconds) FROM leaderboard
 *   WHERE user_id = $uid AND date >= NOW() - INTERVAL '7 days'
 *   GROUP BY date ORDER BY date;
 */
const MOCK_HISTORY = [
  { day: 'Mon', seconds: 340 },
  { day: 'Tue', seconds: 295 },
  { day: 'Wed', seconds: 318 },
  { day: 'Thu', seconds: 262 },
  { day: 'Fri', seconds: 284 },
  { day: 'Sat', seconds: 307 },
  { day: 'Sun', seconds: null }, // today — not yet completed
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FocusStatsProps {
  /** When true, blurs the chart — used as a paywall teaser for free users. */
  locked?: boolean;
}

export default function FocusStats({ locked = false }: FocusStatsProps) {
  const maxSeconds = useMemo(
    () => Math.max(...MOCK_HISTORY.map((d) => d.seconds ?? 0)),
    [],
  );

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}m ${s % 60}s`;

  // 7-day average (excluding null)
  const completed = MOCK_HISTORY.filter((d) => d.seconds !== null) as { day: string; seconds: number }[];
  const avg = Math.round(completed.reduce((sum, d) => sum + d.seconds, 0) / completed.length);

  // Personal best this week
  const best = Math.min(...completed.map((d) => d.seconds));

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Deep Focus Analytics
        </h3>
        <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Last 7 days
        </span>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3">
        <Pill label="Avg time" value={formatTime(avg)} />
        <Pill label="Best time" value={formatTime(best)} accent />
      </div>

      {/* Bar chart */}
      <div
        className={`relative transition-all duration-300 ${
          locked ? 'blur-sm select-none pointer-events-none' : ''
        }`}
      >
        <div className="flex items-end gap-2 h-28">
          {MOCK_HISTORY.map(({ day, seconds }) => {
            const height =
              seconds !== null
                ? Math.max(8, Math.round((seconds / maxSeconds) * 100))
                : 0;

            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                {/* Bar */}
                <div className="w-full relative flex items-end" style={{ height: 96 }}>
                  {seconds !== null ? (
                    <div
                      className="w-full rounded-t-md bg-amber-400/80 dark:bg-amber-500/70
                                 hover:bg-amber-400 dark:hover:bg-amber-500
                                 transition-colors duration-150 group relative"
                      style={{ height: `${height}%` }}
                    >
                      {/* Tooltip */}
                      <div className="
                        absolute -top-7 left-1/2 -translate-x-1/2
                        bg-slate-800 dark:bg-slate-200
                        text-white dark:text-slate-900
                        text-[9px] font-medium px-1.5 py-0.5 rounded
                        opacity-0 group-hover:opacity-100 transition-opacity
                        whitespace-nowrap pointer-events-none
                      ">
                        {formatTime(seconds)}
                      </div>
                    </div>
                  ) : (
                    // Today — dashed placeholder
                    <div
                      className="w-full rounded-t-md border-2 border-dashed
                                 border-slate-200 dark:border-slate-700"
                      style={{ height: '30%' }}
                    />
                  )}
                </div>

                {/* Day label */}
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                  {day}
                </span>
              </div>
            );
          })}
        </div>

        {/* Y-axis ghost lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-full border-t border-slate-100 dark:border-slate-800"
            />
          ))}
        </div>
      </div>

      {locked && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Unlock with Flow Pro to see your full analytics
        </p>
      )}
    </div>
  );
}

function Pill({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2">
      <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {label}
      </p>
      <p
        className={`text-sm font-semibold tabular-nums mt-0.5 ${
          accent
            ? 'text-amber-500'
            : 'text-slate-700 dark:text-slate-200'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
