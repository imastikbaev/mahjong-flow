'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMahjongStore } from '@/store/mahjongStore';
import { useProfile }      from '@/lib/hooks/useProfile';
import { useSubmitScore }  from '@/lib/hooks/useSubmitScore';
import { useGameHistory }  from '@/lib/hooks/useGameHistory';
import { useAuthUser }     from '@/lib/hooks/useAuthUser';
import { useQuests }       from '@/lib/hooks/useQuests';
import { createClient }    from '@/lib/supabase/client';

import TopBar       from '@/components/TopBar';
import MahjongBoard from '@/components/MahjongBoard';
import ProModal     from '@/components/ProModal';
import ResultModal  from '@/components/ResultModal';
import Leaderboard  from '@/components/Leaderboard';
import AICoach      from '@/components/AICoach';
import ProfileModal from '@/components/ProfileModal';
import RulesModal   from '@/components/RulesModal';
import AuthModal    from '@/components/AuthModal';
import QuestsPanel      from '@/components/QuestsPanel';
import UnsolvableToast  from '@/components/UnsolvableToast';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Delay before the result modal appears after a win (ms). */
const WIN_MODAL_DELAY_MS  = 420;
/** Delay before the result modal appears after a sprint timeout (ms). */
const FAIL_MODAL_DELAY_MS = 300;

// ---------------------------------------------------------------------------

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
  const setIsPro          = useMahjongStore((s) => s.setIsPro);

  const { profile, saveProfile }            = useProfile();
  const { submit }                          = useSubmitScore();
  const { history: gameHistory, addRecord } = useGameHistory();
  const { user: authUser }                  = useAuthUser();
  const { quests, updateProgress }          = useQuests(authUser);

  const [proOpen,         setProOpen]         = useState(false);
  const [resultOpen,      setResultOpen]      = useState(false);
  const [profileOpen,     setProfileOpen]     = useState(false);
  const [rulesOpen,       setRulesOpen]       = useState(false);
  const [authOpen,        setAuthOpen]        = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCoach,       setShowCoach]       = useState(false);
  const [showQuests,      setShowQuests]      = useState(false);

  const submittedAtRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // PRO status — sync from Supabase on auth change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!authUser) { setIsPro(false); return; }

    createClient()
      .from('users')
      .select('is_pro')
      .eq('id', authUser.id)
      .single()
      .then(({ data }) => { if (data) setIsPro(Boolean(data.is_pro)); });
  }, [authUser, setIsPro]);

  /**
   * Called by the "Unlock PRO (Demo)" button inside ProModal.
   * Writes is_pro = true to the DB (users_own_write policy enforces auth.uid()),
   * then updates local Zustand state immediately so the UI responds instantly.
   */
  const handleUnlockPro = useCallback(async () => {
    if (!authUser) { setAuthOpen(true); return; }
    const { error } = await createClient()
      .from('users')
      .update({ is_pro: true })
      .eq('id', authUser.id);
    if (!error) setIsPro(true);
  }, [authUser, setIsPro]);

  // ---------------------------------------------------------------------------
  // Game-completion side-effects
  //
  // We store the scoring callback in a ref so the useEffect can safely depend
  // only on the trigger flags (isComplete / isFailed).  The ref is re-assigned
  // on every render, which means the callback always closes over fresh values
  // without stale-closure bugs — and without needing eslint-disable comments.
  // ---------------------------------------------------------------------------

  const onGameWinRef = useRef(() => {});
  onGameWinRef.current = () => {
    if (submittedAtRef.current === elapsedSeconds) return;
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

    if (gameMode === 'daily' && !sprintMode) {
      updateProgress('daily_complete_challenge', 1);
      updateProgress('weekly_daily_7', 1);
      if (score >= 8000) updateProgress('weekly_score_8000', 1);
      submit({
        userId:      profile.userId,
        nickname:    profile.nickname,
        city:        profile.city,
        timeSeconds: elapsedSeconds,
        type:        'daily',
      });
    }
    if (sprintMode) updateProgress('daily_sprint_3', 1);
    updateProgress('daily_pairs_50', pairsMatched);
    updateProgress('weekly_pairs_500', pairsMatched);
  };

  const onGameFailRef = useRef(() => {});
  onGameFailRef.current = () => {
    if (submittedAtRef.current === elapsedSeconds) return;
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
    updateProgress('daily_sprint_3', 1);
    updateProgress('daily_pairs_50', pairsMatched);
    updateProgress('weekly_pairs_500', pairsMatched);
  };

  // Game complete (win)
  useEffect(() => {
    if (!isComplete) return;
    const timer = setTimeout(() => setResultOpen(true), WIN_MODAL_DELAY_MS);
    onGameWinRef.current();
    return () => clearTimeout(timer);
  }, [isComplete]);

  // Sprint timeout (fail)
  useEffect(() => {
    if (!isFailed) return;
    const timer = setTimeout(() => setResultOpen(true), FAIL_MODAL_DELAY_MS);
    onGameFailRef.current();
    return () => clearTimeout(timer);
  }, [isFailed]);

  // Reset modal when a new game starts
  useEffect(() => {
    if (!isComplete && !isFailed) {
      setResultOpen(false);
      submittedAtRef.current = null;
    }
  }, [isComplete, isFailed]);

  const sidebarOpen = showLeaderboard || (showCoach && isPro) || showQuests;

  return (
    <div className="flex flex-col h-full min-h-screen relative z-10">
      <TopBar
        onProClick={    () => setProOpen(true)}
        onProfileClick={() => setProfileOpen(true)}
        onRulesClick={  () => setRulesOpen(true)}
        onSignInClick={ () => setAuthOpen(true)}
        nickname={profile.nickname}
        authUser={authUser}
      />

      <div className="flex flex-1 overflow-hidden">
        <MahjongBoard />

        {sidebarOpen && (
          <aside className="hidden lg:flex flex-col gap-4 p-4 w-80 shrink-0 overflow-y-auto">
            {showCoach && isPro && <AICoach />}
            {showQuests          && (
              <QuestsPanel
                quests={quests}
                user={authUser}
                onSignInClick={() => setAuthOpen(true)}
              />
            )}
            {showLeaderboard     && <Leaderboard userCity={profile.city} />}
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
          onClick={() => setShowQuests((v) => !v)}
          className="
            px-4 py-2 rounded-full backdrop-blur-sm
            bg-white/90 dark:bg-[#0e0e0e]/90
            border border-black/[0.1] dark:border-white/[0.1]
            hover:border-black/[0.18] dark:hover:border-white/[0.18]
            text-xs font-normal tracking-tight
            text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200
            transition-all duration-200 active:scale-95
          "
          aria-label={showQuests ? 'Hide quests' : 'Show quests'}
        >
          {showQuests ? '✕ hide quests' : '◇ quests'}
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

      <UnsolvableToast />

      {/* Modals */}
      <AuthModal    isOpen={authOpen}    onClose={() => setAuthOpen(false)} />
      <ProModal
        isOpen={proOpen}
        onClose={() => setProOpen(false)}
        gameHistory={gameHistory}
        onUnlockPro={handleUnlockPro}
      />
      <RulesModal   isOpen={rulesOpen}   onClose={() => setRulesOpen(false)} />
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
        onSave={saveProfile}
        user={authUser}
        onSignInClick={() => { setProfileOpen(false); setAuthOpen(true); }}
      />
      <ResultModal
        isOpen={resultOpen}
        onClose={() => setResultOpen(false)}
        elapsedSeconds={elapsedSeconds}
        status={isFailed ? 'fail' : 'win'}
        onViewLeaderboard={() => { setResultOpen(false); setShowLeaderboard(true); }}
      />
    </div>
  );
}
