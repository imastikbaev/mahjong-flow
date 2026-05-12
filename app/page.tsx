'use client';

import { useEffect, useState } from 'react';
import { useMahjongStore } from '@/store/mahjongStore';

import TopBar       from '@/components/TopBar';
import MahjongBoard from '@/components/MahjongBoard';
import ProModal     from '@/components/ProModal';
import WinModal     from '@/components/WinModal';
import Leaderboard  from '@/components/Leaderboard';

export default function Home() {
  const isComplete     = useMahjongStore((s) => s.isComplete);
  const elapsedSeconds = useMahjongStore((s) => s.elapsedSeconds);

  const [proOpen, setProOpen]         = useState(false);
  const [winOpen, setWinOpen]         = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Auto-show the win modal the moment the board is cleared.
  // A short delay lets the last tile's exit animation finish first.
  useEffect(() => {
    if (!isComplete) return;
    const timer = setTimeout(() => setWinOpen(true), 420);
    return () => clearTimeout(timer);
  }, [isComplete]);

  // Reset win modal when a new game starts
  useEffect(() => {
    if (!isComplete) setWinOpen(false);
  }, [isComplete]);

  return (
    <div className="flex flex-col h-full min-h-screen relative z-10">
      <TopBar onProClick={() => setProOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Board — takes all available space */}
        <MahjongBoard />

        {/* Leaderboard sidebar — slides in alongside the board */}
        {showLeaderboard && (
          <aside className="hidden lg:flex flex-col gap-4 p-4 w-80 shrink-0 overflow-y-auto">
            <Leaderboard userCity="Oskemen" />
          </aside>
        )}
      </div>

      {/* Toggle leaderboard button (bottom-right FAB) */}
      <button
        onClick={() => setShowLeaderboard((v) => !v)}
        className="
          fixed bottom-5 right-5 z-40
          px-4 py-2 rounded-full
          bg-white/90 dark:bg-slate-800/90
          border border-slate-200 dark:border-slate-700
          shadow-lg backdrop-blur-sm
          text-xs font-medium text-slate-600 dark:text-slate-300
          hover:bg-white dark:hover:bg-slate-800
          active:scale-95 transition-all duration-150
        "
        aria-label={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
      >
        {showLeaderboard ? '✕ Hide Scores' : '◎ Leaderboard'}
      </button>

      {/* Modals */}
      <ProModal isOpen={proOpen} onClose={() => setProOpen(false)} />

      <WinModal
        isOpen={winOpen}
        onClose={() => setWinOpen(false)}
        elapsedSeconds={elapsedSeconds}
        onViewLeaderboard={() => {
          setWinOpen(false);
          setShowLeaderboard(true);
        }}
      />
    </div>
  );
}
