'use client';

import { useMemo } from 'react';
import type { GameRecord } from '@/lib/hooks/useGameHistory';

interface FocusStatsProps {
  locked?:      boolean;
  gameHistory?: GameRecord[];
}

export default function FocusStats({ locked = false, gameHistory = [] }: FocusStatsProps) {
  const last7Days = useMemo(() => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const best = gameHistory
        .filter((r) => r.date === dateStr && r.completed)
        .sort((a, b) => a.seconds - b.seconds)[0];
      return { day: dayNames[d.getDay()], seconds: best?.seconds ?? null };
    });
  }, [gameHistory]);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (gameHistory.some((r) => r.date === dateStr && r.completed)) count++;
      else break;
    }
    return count;
  }, [gameHistory]);

  const completed  = last7Days.filter((d): d is { day: string; seconds: number } => d.seconds !== null);
  const hasData    = completed.length > 0;
  const maxSeconds = hasData ? Math.max(...completed.map((d) => d.seconds)) : 300;
  const avg        = hasData ? Math.round(completed.reduce((s, d) => s + d.seconds, 0) / completed.length) : null;
  const best       = hasData ? Math.min(...completed.map((d) => d.seconds)) : null;
  const fmt        = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-normal text-neutral-300 tracking-tight">Deep Focus Analytics</p>
        <span className="text-[9px] uppercase tracking-[0.12em] text-neutral-600">Last 7 days</span>
      </div>

      <div className="flex gap-2">
        <Pill label="Avg time"  value={avg  !== null ? fmt(avg)  : '—'} />
        <Pill label="Best time" value={best !== null ? fmt(best) : '—'} />
        <Pill label="Streak"    value={streak > 0 ? `${streak}d` : '—'} />
      </div>

      <div className={`relative transition-all duration-300 ${locked ? 'blur-sm select-none pointer-events-none' : ''}`}>
        <div className="flex items-end gap-1.5 h-28">
          {last7Days.map(({ day, seconds }) => {
            const h = seconds !== null ? Math.max(8, Math.round((seconds / maxSeconds) * 100)) : 0;
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full relative flex items-end" style={{ height: 96 }}>
                  {seconds !== null ? (
                    <div
                      className="w-full rounded-t-sm bg-white/[0.12] hover:bg-white/[0.2] transition-colors duration-150 group relative"
                      style={{ height: `${h}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/[0.1] text-neutral-300 text-[9px] font-normal px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {fmt(seconds)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full rounded-t-sm border border-dashed border-white/[0.08]" style={{ height: '30%' }} />
                  )}
                </div>
                <span className="text-[9px] text-neutral-700 font-normal">{day}</span>
              </div>
            );
          })}
        </div>
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
          {[0, 1, 2].map((i) => <div key={i} className="w-full border-t border-white/[0.04]" />)}
        </div>
      </div>

      {!hasData && !locked && (
        <p className="text-center text-[11px] font-light text-neutral-700 tracking-tight">
          Complete a game to track your focus sessions
        </p>
      )}
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
      <p className="text-[9px] uppercase tracking-[0.12em] text-neutral-600 font-normal">{label}</p>
      <p className="text-sm font-normal tabular-nums tracking-tight text-neutral-300 mt-0.5">{value}</p>
    </div>
  );
}
