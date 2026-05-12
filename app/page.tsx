'use client';

import { useEffect, useState } from 'react';
import { useMahjongStore } from '@/store/mahjongStore';
import { useProfile } from '@/lib/hooks/useProfile';

import TopBar       from '@/components/TopBar';
import MahjongBoard from '@/components/MahjongBoard';
import ProModal     from '@/components/ProModal';
import WinModal     from '@/components/WinModal';
import Leaderboard  from '@/components/Leaderboard';
import ProfileModal from '@/components/ProfileModal';

export default function Home() {
  const isComplete     = useMahjongStore((s) => s.isComplete);
  const elapsedSeconds = useMahjongStore((s) => s.elapsedSeconds);

  const { profile, saveProfile } = useProfile();

  const [proOpen,     setProOpen]     = useState(false);
  const [winOpen,     setWinOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    if (!isComplete) return;
    const timer = setTimeout(() => setWinOpen(true), 420);
    return () => clearTimeout(timer);
  }, [isComplete]);

  useEffect(() => {
    if (!isComplete) setWinOpen(false);
  }, [isComplete]);

  return (
    <div className="flex flex-col h-full min-h-screen relative z-10">
      <TopBar
        onProClick={() => setProOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
        nickname={profile.nickname}
      />

      <div className="flex flex-1 overflow-hidden">
        <MahjongBoard />

        {showLeaderboard && (
          <aside className="hidden lg:flex flex-col gap-4 p-4 w-80 shrink-0 overflow-y-auto">
            <Leaderboard userCity={profile.city} />
          </aside>
        )}
      </div>

      {/* Toggle leaderboard FAB */}
      <button
        onClick={() => setShowLeaderboard((v) => !v)}
        className="
          fixed bottom-5 right-5 z-40
          px-4 py-2 rounded-full
          bg-[#0e0e0e]/90 backdrop-blur-sm
          border border-white/[0.1] hover:border-white/[0.18]
          text-xs font-normal tracking-tight
          text-neutral-500 hover:text-neutral-200
          transition-all duration-200 active:scale-95
        "
        aria-label={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
      >
        {showLeaderboard ? '✕ hide scores' : '◎ leaderboard'}
      </button>

      {/* Modals */}
      <ProModal     isOpen={proOpen}     onClose={() => setProOpen(false)} />
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        onSave={saveProfile}
      />
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
