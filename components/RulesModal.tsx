'use client';

import Modal from './Modal';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      {/* Header */}
      <div className="relative px-6 pt-7 pb-5 border-b border-black/[0.06] dark:border-white/[0.06] bg-neutral-50 dark:bg-[#111111]">
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300
                     transition-colors duration-150 text-base leading-none"
          aria-label="Close"
        >
          ✕
        </button>
        <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-600 font-normal mb-2">
          How to play
        </p>
        <h2 className="text-xl font-light tracking-tight text-neutral-900 dark:text-neutral-100">
          Mahjong Flow
        </h2>
        <p className="mt-1 text-sm font-light text-neutral-500 tracking-tight">
          Clear the board by matching all pairs.
        </p>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5 bg-white dark:bg-[#0e0e0e] max-h-[65vh] overflow-y-auto">
        <RuleSection icon="◎" title="Goal">
          Remove all 144 tiles from the board by matching identical pairs before time runs out.
        </RuleSection>

        <RuleSection icon="◻" title="Free tiles">
          A tile is free when it is <em className="not-italic text-neutral-800 dark:text-neutral-300">not covered</em> by
          another tile above, and has at least one open side — left or right. Dimmed tiles are blocked.
        </RuleSection>

        <RuleSection icon="✦" title="Matching">
          Tap a free tile to select it (it lights up). Tap a second free tile of the
          same symbol to remove the pair. Tap the same tile again to deselect.
        </RuleSection>

        <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />

        <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-600 font-normal">
          Tools
        </p>

        <RuleSection icon="◎" title="Hint">
          Shows one free matching pair with a soft glow. Press again to dismiss.
        </RuleSection>

        <RuleSection icon="↺" title="Shuffle">
          Redistributes all remaining tiles in a new solvable order.
          The button pulses when no moves are available.
        </RuleSection>

        <RuleSection icon="↺" title="Undo" pro>
          Restores the last matched pair back to the board. Pro only.
        </RuleSection>

        <RuleSection icon="↺" title="Restart">
          Starts the current board over from scratch. Tap once to arm (button turns red), tap again within 2 seconds to confirm.
        </RuleSection>

        <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />

        <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-600 font-normal">
          Modes
        </p>

        <RuleSection icon="◇" title="Daily">
          Everyone gets the same board each day, generated from today&apos;s date. Scores go to the global leaderboard.
        </RuleSection>

        <RuleSection icon="◇" title="Practice">
          A random board each time — no leaderboard submission. Use it to warm up or test strategies.
        </RuleSection>

        <RuleSection icon="⏱" title="Sprint" pro>
          3 minutes, as many pairs as possible. Score = pairs × 100 + remaining seconds × 10.
          The timer turns red below 30 seconds. Pro only.
        </RuleSection>

        <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />

        <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-600 font-normal">
          AI Coach
        </p>

        <RuleSection icon="◈" title="Board analysis">
          Open the coach panel (◈ ai coach button, bottom-right) to see live tips: how many free pairs
          remain, which layer to prioritise, and which single move unlocks the most tiles.
        </RuleSection>

        <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />

        <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-600 font-normal">
          Quests
        </p>

        <RuleSection icon="◇" title="Daily quests">
          Three quests reset every day at midnight UTC: complete the Daily Challenge, play Sprint
          matches, and clear 50 pairs. Open the quest panel (◇ quests, bottom-right) to track progress.
        </RuleSection>

        <RuleSection icon="◆" title="Weekly quests">
          Three longer quests reset each Monday: score 8 000+ in a single game, clear 500 pairs
          total, and complete the Daily Challenge 7 days running.
        </RuleSection>

        <RuleSection icon="✦" title="Account required">
          Quest progress is saved to your account. Sign in (top-right) with Google or email to unlock
          tracking and keep your streak across devices.
        </RuleSection>

        <div className="h-px bg-black/[0.06] dark:bg-white/[0.06]" />

        <p className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-600 font-normal">
          Difficulty
        </p>

        <div className="space-y-2 text-sm font-light text-neutral-500 dark:text-neutral-400 tracking-tight leading-relaxed">
          <p>
            <span className="text-neutral-800 dark:text-neutral-300">Easy</span> — fewer tile types, matches appear more often.
          </p>
          <p>
            <span className="text-neutral-800 dark:text-neutral-300">Medium</span> — balanced variety.
          </p>
          <p>
            <span className="text-neutral-800 dark:text-neutral-300">Hard</span> — all 36 types, no guaranteed solve path.
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function RuleSection({
  icon,
  title,
  pro = false,
  children,
}: {
  icon: string;
  title: string;
  pro?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-neutral-500 dark:text-neutral-700 text-sm w-4 shrink-0 text-center">{icon}</span>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 font-normal">
            {title}
          </span>
          {pro && (
            <span className="text-[9px] px-1.5 py-0.5 rounded border border-black/[0.1] dark:border-white/[0.1] text-neutral-500 dark:text-neutral-600 tracking-tight">
              Pro
            </span>
          )}
        </div>
        <p className="text-sm font-light text-neutral-500 dark:text-neutral-400 tracking-tight leading-relaxed">
          {children}
        </p>
      </div>
    </div>
  );
}
