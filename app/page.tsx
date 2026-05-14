'use client';

import { useEffect, useRef, useState } from 'react';
import { useMahjongStore } from '@/store/mahjongStore';
import { useProfile } from '@/lib/hooks/useProfile';
import { useSubmitScore } from '@/lib/hooks/useSubmitScore';
import { useGameHistory } from '@/lib/hooks/useGameHistory';

import TopBar       from '@/components/TopBar';
import MahjongBoard from '@/components/MahjongBoard';
import ProModal     from '@/components/ProModal';
import WinModal     from '@/components/WinModal';
import Leaderboard  from '@/components/Leaderboard';
import AICoach      from '@/components/AICoach';
import ProfileModal from '@/components/ProfileModal';
import RulesModal   from '@/components/RulesModal';

export default function Home() {
  const isComplete        = useMahjongStore((s) => s.isComplete);
  const isFailed          = useMahjongStore((s) => s.isFailed);
  const elapsedSeconds    = useMahjongStore((s) => s.elapsedSeconds);
  const gameMode          = useMahjongStore((s) => s.gameMode);
  const sprintMode        = useMahjongStore((s) => s.sprintMode);
  const sprintSecondsLeft = useMahjongStore((s) => s.sprintSecondsLeft);
  const difficulty        = useMahjongStore((s) => s.difficulty);
  const tiles             = useMahjongStore((s) => s.tiles);
  const isPro             = useMahjongStore((s) => s.isPro);

  const { profile, saveProfile }          = useProfile();
  const { submit }                        = useSubmitScore();
  const { history: gameHistory, addRecord } = useGameHistory();

  const [proOpen,         setProOpen]         = useState(false);
  const [winOpen,         setWinOpen]         = useState(false);
  const [profileOpen,     setProfileOpen]     = useState(false);
  const [rulesOpen,       setRulesOpen]       = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCoach,       setShowCoach]       = useState(false);

  const submittedAtRef = useRef<number | null>(null);

  // Game complete (win)
  useEffect(() => {
    if (!isComplete) return;
    const timer = setTimeout(() => setWinOpen(true), 420);

    if (submittedAtRef.current !== elapsedSeconds) {
      submittedAtRef.current = elapsedSeconds;

      const pairsMatched = Math.floor(tiles.filter((t) => t.state === 'matched').length / 2);
      const score = sprintMode
        ? pairsMatched * 100 + sprintSecondsLeft * 10
        : Math.max(0, 10_000 - elapsedSeconds * 5);

      addRecord({
        date:         new Date().toISOString().slice(0, 10),
        seconds:      elapsedSeconds,
        score,
        difficulty,
        mode:         sprintMode ? 'sprint' : gameMode,
        completed:    true,
        pairsMatched: 72,
      });

      // Only submit daily non-sprint games to leaderboard
      if (gameMode === 'daily' && !sprintMode) {
        submit({
          userId:      profile.userId,
          nickname:    profile.nickname,
          city:        profile.city,
          timeSeconds: elapsedSeconds,
          type:        'daily',
        });
      }
    }

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete]);

  // Sprint timeout (fail)
  useEffect(() => {
    if (!isFailed) return;
    const timer = setTimeout(() => setWinOpen(true), 300);

    if (submittedAtRef.current !== elapsedSeconds) {
      submittedAtRef.current = elapsedSeconds;
      const pairsMatched = Math.floor(tiles.filter((t) => t.state === 'matched').length / 2);
      addRecord({
        date:         new Date().toISOString().slice(0, 10),
        seconds:      elapsedSeconds,
        score:        pairsMatched * 100 + sprintSecondsLeft * 10,
        difficulty,
        mode:         'sprint',
        completed:    false,
        pairsMatched,
      });
    }

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFailed]);

  useEffect(() => {
    if (!isComplete && !isFailed) {
      setWinOpen(false);
      submittedAtRef.current = null;
    }
  }, [isComplete, isFailed]);

  return (
    <div className="flex flex-col h-full min-h-screen relative z-10">
      <TopBar
        onProClick={    () => setProOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
        onRulesClick={  () => setRulesOpen(true)}
        nickname={profile.nickname}
      />

      <div className="flex flex-1 overflow-hidden">
        <MahjongBoard />

        {(showLeaderboard || (showCoach && isPro)) && (
          <aside className="hidden lg:flex flex-col gap-4 p-4 w-80 shrink-0 overflow-y-auto">
            {showCoach && isPro && <AICoach />}
            {showLeaderboard    && <Leaderboard userCity={profile.city} />}
          </aside>
        )}
      </div>

      {/* FAB buttons — bottom-right */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2 items-end">
        <button
          onClick={() => isPro ? setShowCoach((v) => !v) : setProOpen(true)}
          className="
            px-4 py-2 rounded-full backdrop-blur-sm
            bg-white/90 dark:bg-[#0e0e0e]/90
            border border-black/[0.1] dark:border-white/[0.1]
            hover:border-black/[0.18] dark:hover:border-white/[0.18]
            text-xs font-normal tracking-tight
            text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200
            transition-all duration-200 active:scale-95
          "
          aria-label={showCoach ? 'Hide AI coach' : 'Show AI coach'}
        >
          {showCoach && isPro ? '✕ hide coach' : `◈ ai coach${isPro ? '' : ' ✦'}`}
        </button>
        <button
          onClick={() => setShowLeaderboard((v) => !v)}
          className="
            px-4 py-2 rounded-full backdrop-blur-sm
            bg-white/90 dark:bg-[#0e0e0e]/90
            border border-black/[0.1] dark:border-white/[0.1]
            hover:border-black/[0.18] dark:hover:border-white/[0.18]
            text-xs font-normal tracking-tight
            text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200
            transition-all duration-200 active:scale-95
          "
          aria-label={showLeaderboard ? 'Hide leaderboard' : 'Show leaderboard'}
        >
          {showLeaderboard ? '✕ hide scores' : '◎ leaderboard'}
        </button>
      </div>

      {/* Modals */}
      <ProModal isOpen={proOpen} onClose={() => setProOpen(false)} gameHistory={gameHistory} />
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
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
