'use client';

import type { QuestProgress } from '@/lib/hooks/useQuests';
import type { User } from '@supabase/supabase-js';

interface QuestsPanelProps {
  quests:       QuestProgress[];
  user:         User | null | undefined;
  onSignInClick: () => void;
}

export default function QuestsPanel({ quests, user, onSignInClick }: QuestsPanelProps) {
  const daily  = quests.filter((q) => q.period === 'daily');
  const weekly = quests.filter((q) => q.period === 'weekly');

  return (
    <aside className="
      w-full max-w-sm
      bg-white dark:bg-white/[0.03] backdrop-blur-sm
      rounded-xl border border-black/[0.07] dark:border-white/[0.07]
      overflow-hidden
    ">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-600 font-normal mb-1">
          Quests
        </p>
        <p className="text-xs font-light text-neutral-500 tracking-tight">
          Daily &amp; weekly challenges
        </p>
      </div>

      <div className="px-4 py-4 space-y-5">
        {!user ? (
          /* Locked state */
          <div className="text-center py-4 space-y-3">
            <p className="text-xs font-light text-neutral-500 dark:text-neutral-400 tracking-tight leading-relaxed">
              Sign in to track quests and earn rewards.
            </p>
            <button
              onClick={onSignInClick}
              className="
                px-4 py-2 rounded-lg text-xs font-normal tracking-tight
                bg-neutral-900 text-white hover:bg-neutral-800
                dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-100
                transition-colors duration-150
              "
            >
              Sign in ✦
            </button>
          </div>
        ) : (
          <>
            <QuestGroup title="Daily" quests={daily} />
            <QuestGroup title="Weekly" quests={weekly} />
          </>
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------

function QuestGroup({ title, quests }: { title: string; quests: QuestProgress[] }) {
  if (quests.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="text-[9px] uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-600 font-normal">
        {title}
      </p>
      <div className="space-y-3">
        {quests.map((q) => <QuestRow key={q.id} quest={q} />)}
      </div>
    </div>
  );
}

function QuestRow({ quest: q }: { quest: QuestProgress }) {
  const pct = Math.min(100, Math.round((q.currentValue / q.target) * 100));

  return (
    <div className={`space-y-1.5 rounded-lg px-3 py-2.5 border transition-colors duration-150 ${
      q.isCompleted
        ? 'bg-emerald-50 dark:bg-emerald-500/[0.06] border-emerald-200 dark:border-emerald-500/[0.2]'
        : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/[0.05] dark:border-white/[0.05]'
    }`}>
      {/* Title row */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-normal tracking-tight ${
          q.isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'
        }`}>
          {q.isCompleted ? '✦ ' : ''}{q.title}
        </span>
        <span className="text-[10px] font-light text-neutral-400 dark:text-neutral-600 tabular-nums shrink-0">
          {q.currentValue} / {q.target}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            q.isCompleted ? 'bg-emerald-400' : 'bg-neutral-400 dark:bg-neutral-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Reward */}
      <p className="text-[10px] font-light text-neutral-400 dark:text-neutral-600 tracking-tight">
        {q.reward}
      </p>
    </div>
  );
}
