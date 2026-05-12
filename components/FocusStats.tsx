'use client';

import { useMemo } from 'react';

const MOCK_HISTORY = [
  { day: 'Mon', seconds: 340 },
  { day: 'Tue', seconds: 295 },
  { day: 'Wed', seconds: 318 },
  { day: 'Thu', seconds: 262 },
  { day: 'Fri', seconds: 284 },
  { day: 'Sat', seconds: 307 },
  { day: 'Sun', seconds: null },
];

interface FocusStatsProps {
  locked?: boolean;
}

export default function FocusStats({ locked = false }: FocusStatsProps) {
  const maxSeconds = useMemo(
    () => Math.max(...MOCK_HISTORY.map((d) => d.seconds ?? 0)),
    [],
  );

  const formatTime = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

  const completed = MOCK_HISTORY.filter((d) => d.seconds !== null) as { day: string; seconds: number }[];
  const avg  = Math.round(completed.reduce((sum, d) => sum + d.seconds, 0) / completed.length);
  const best = Math.min(...completed.map((d) => d.seconds));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-normal text-neutral-300 tracking-tight">
          Deep Focus Analytics
        </p>
        <span className="text-[9px] uppercase tracking-[0.12em] text-neutral-600">
          Last 7 days
        </span>
      </div>

      {/* Summary pills */}
      <div className="flex gap-2">
        <Pill label="Avg time" value={formatTime(avg)} />
        <Pill label="Best time" value={formatTime(best)} />
      </div>

      {/* Bar chart */}
      <div
        className={`relative transition-all duration-300 ${
          locked ? 'blur-sm select-none pointer-events-none' : ''
        }`}
      >
        <div className="flex items-end gap-1.5 h-28">
          {MOCK_HISTORY.map(({ day, seconds }) => {
            const height =
              seconds !== null
                ? Math.max(8, Math.round((seconds / maxSeconds) * 100))
                : 0;

            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full relative flex items-end" style={{ height: 96 }}>
                  {seconds !== null ? (
                    <div
                      className="w-full rounded-t-sm bg-white/[0.12] hover:bg-white/[0.2]
                                 transition-colors duration-150 group relative"
                      style={{ height: `${height}%` }}
                    >
                      {/* Tooltip */}
                      <div className="
                        absolute -top-6 left-1/2 -translate-x-1/2
                        bg-[#1a1a1a] border border-white/[0.1]
                        text-neutral-300 text-[9px] font-normal px-1.5 py-0.5 rounded
                        opacity-0 group-hover:opacity-100 transition-opacity
                        whitespace-nowrap pointer-events-none
                      ">
                        {formatTime(seconds)}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="w-full rounded-t-sm border border-dashed border-white/[0.08]"
                      style={{ height: '30%' }}
                    />
                  )}
                </div>
                <span className="text-[9px] text-neutral-700 font-normal">{day}</span>
              </div>
            );
          })}
        </div>

        {/* Y-axis grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-full border-t border-white/[0.04]" />
          ))}
        </div>
      </div>

      {locked && (
        <p className="text-center text-[11px] font-light text-neutral-700 tracking-tight">
          Unlock with Flow Pro to see your full analytics
        </p>
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2">
      <p className="text-[9px] uppercase tracking-[0.12em] text-neutral-600 font-normal">
        {label}
      </p>
      <p className="text-sm font-normal tabular-nums tracking-tight text-neutral-300 mt-0.5">
        {value}
      </p>
    </div>
  );
}
