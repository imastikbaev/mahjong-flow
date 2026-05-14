'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { RotateCcw, Layers } from 'lucide-react';
import { useMahjongStore, hasAvailableMoves } from '@/store/mahjongStore';
import ThemeToggle from './ThemeToggle';
import type { User } from '@supabase/supabase-js';

interface TopBarProps {
  onProClick:     () => void;
  onProfileClick: () => void;
  onRulesClick:   () => void;
  onSignInClick:  () => void;
  nickname:       string;
  authUser?:      User | null;
}

export default function TopBar({ onProClick, onProfileClick, onRulesClick, onSignInClick, nickname, authUser }: TopBarProps) {
  const tiles          = useMahjongStore((s) => s.tiles);
  const initBoard      = useMahjongStore((s) => s.initBoard);
  const isComplete     = useMahjongStore((s) => s.isComplete);
  const elapsedSeconds = useMahjongStore((s) => s.elapsedSeconds);
  const tickSecond     = useMahjongStore((s) => s.tickSecond);
  const isPro          = useMahjongStore((s) => s.isPro);
  const history        = useMahjongStore((s) => s.history);
  const undoMove       = useMahjongStore((s) => s.undoMove);
  const difficulty          = useMahjongStore((s) => s.difficulty);
  const setDifficulty       = useMahjongStore((s) => s.setDifficulty);
  const getHint             = useMahjongStore((s) => s.getHint);
  const hintedId            = useMahjongStore((s) => s.hintedId);
  const reshuffleRemaining  = useMahjongStore((s) => s.reshuffleRemaining);
  const resetBoard          = useMahjongStore((s) => s.resetBoard);
  const skin                = useMahjongStore((s) => s.skin);
  const setSkin             = useMahjongStore((s) => s.setSkin);
  const gameMode            = useMahjongStore((s) => s.gameMode);
  const setGameMode         = useMahjongStore((s) => s.setGameMode);
  const sprintMode          = useMahjongStore((s) => s.sprintMode);
  const sprintSecondsLeft   = useMahjongStore((s) => s.sprintSecondsLeft);
  const isFailed            = useMahjongStore((s) => s.isFailed);
  const setSprintMode       = useMahjongStore((s) => s.setSprintMode);

  const hasIdle    = tiles.some((t) => t.state === 'idle');
  const isDeadlock = useMemo(
    () => hasIdle && !isComplete && !hasAvailableMoves(tiles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tiles, isComplete],
  );

  const idleCount = tiles.filter((t) => t.state === 'idle' || t.state === 'selected').length;
  const pairsLeft = Math.floor(idleCount / 2);

  const boardSig    = tiles.reduce((acc, t) => acc + t.id, 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isComplete || isFailed) { if (intervalRef.current) clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(tickSecond, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isComplete, isFailed, boardSig, tickSecond]);

  // Sprint: show countdown; normal: show elapsed
  const displaySeconds = sprintMode ? sprintSecondsLeft : elapsedSeconds;
  const mm = String(Math.floor(displaySeconds / 60)).padStart(2, '0');
  const ss = String(displaySeconds % 60).padStart(2, '0');
  const sprintUrgent   = sprintMode && sprintSecondsLeft <= 30;

  // Restart — two-tap confirmation (arm → confirm within 2s)
  const [restartArmed, setRestartArmed] = useState(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleRestart() {
    if (restartArmed) {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      setRestartArmed(false);
      resetBoard();
    } else {
      setRestartArmed(true);
      restartTimerRef.current = setTimeout(() => setRestartArmed(false), 2000);
    }
  }

  // Shared style helpers
  const actionBtn = (active = false) => [
    'px-3 py-1.5 rounded-md text-xs font-normal tracking-tight',
    'transition-all duration-200 ease-out active:scale-95',
    active
      ? 'text-neutral-800 dark:text-neutral-300 bg-black/[0.05] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.12]'
      : 'text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.03]',
  ].join(' ');

  const diffBtn = (d: string) => [
    'px-2.5 py-1.5 text-[10px] font-normal tracking-tight transition-colors duration-150',
    difficulty === d
      ? 'bg-black/[0.06] dark:bg-white/[0.08] text-neutral-800 dark:text-neutral-300'
      : 'text-neutral-500 dark:text-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-400',
  ].join(' ');

  const shuffleBtn = [
    'px-3 py-1.5 rounded-md text-xs font-normal tracking-tight',
    'transition-all duration-200 ease-out active:scale-95',
    isDeadlock
      ? 'border border-black/[0.2] dark:border-white/[0.2] text-neutral-800 dark:text-neutral-200 bg-black/[0.05] dark:bg-white/[0.06] animate-pulse'
      : 'text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.03]',
  ].join(' ');

  return (
    <header className="
      w-full
      bg-neutral-100/90 dark:bg-[#0a0a0a]/90 backdrop-blur-xl
      border-b border-black/[0.07] dark:border-white/[0.06]
      sticky top-0 z-50
    ">

      {/* ── Desktop layout (≥ sm) ─────────────────────────────────────── */}
      <div className="hidden sm:flex items-center justify-between px-6 py-3.5">
        {/* Brand + profile */}
        <div className="flex items-center gap-3">
          <Brand />
          {authUser ? (
            <button
              onClick={onProfileClick}
              className="flex items-center gap-1.5 text-[11px] font-normal tracking-tight
                         text-neutral-600 dark:text-neutral-400
                         hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors duration-150"
              title="Profile"
            >
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 dark:bg-emerald-400/20 flex items-center justify-center text-[8px] text-emerald-600 dark:text-emerald-400 shrink-0">✦</span>
              {authUser.user_metadata?.full_name?.split(' ')[0] ?? authUser.email?.split('@')[0] ?? 'me'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onProfileClick}
                className="text-[11px] font-normal tracking-tight text-neutral-500 dark:text-neutral-600
                           hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors duration-150"
                title="Edit profile"
              >
                {nickname || 'anonymous'}
              </button>
              <button
                onClick={onSignInClick}
                className="text-[10px] font-normal tracking-tight text-neutral-400 dark:text-neutral-600
                           hover:text-neutral-700 dark:hover:text-neutral-400 transition-colors duration-150"
                title="Sign in"
              >
                sign in →
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-10">
          <Stat
            label={sprintMode ? 'sprint' : 'time'}
            value={`${mm}:${ss}`}
            highlight={isComplete}
            urgent={sprintUrgent}
          />
          <Stat label="pairs" value={isComplete || isFailed ? '—' : String(pairsLeft)} highlight={isComplete} />
        </div>

        {/* Mode + Difficulty */}
        <div className="flex items-center gap-2">
          {/* Daily / Practice toggle */}
          <div className="flex items-center rounded-md border border-black/[0.08] dark:border-white/[0.07] overflow-hidden">
            {(['daily', 'practice'] as const).map((m) => (
              <button
                key={m}
                onClick={() => !sprintMode && setGameMode(m)}
                disabled={sprintMode}
                className={[
                  'px-2.5 py-1.5 text-[10px] font-normal tracking-tight transition-colors duration-150',
                  gameMode === m && !sprintMode
                    ? 'bg-black/[0.06] dark:bg-white/[0.08] text-neutral-800 dark:text-neutral-300'
                    : 'text-neutral-500 dark:text-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-400 disabled:opacity-30',
                ].join(' ')}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <div className="flex items-center rounded-md border border-black/[0.08] dark:border-white/[0.07] overflow-hidden">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={diffBtn(d)}>{d}</button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Rules */}
          <button onClick={onRulesClick} className={actionBtn()} title="How to play" aria-label="Rules">
            ?
          </button>

          {/* Pro */}
          <button
            onClick={onProClick}
            className={[
              'px-3 py-1.5 rounded-md text-xs font-normal tracking-tight',
              'transition-all duration-200 ease-out active:scale-95',
              isPro
                ? 'border border-black/[0.15] dark:border-white/[0.15] text-neutral-800 dark:text-neutral-200 bg-black/[0.05] dark:bg-white/[0.06]'
                : 'border border-black/[0.1] dark:border-white/[0.1] hover:border-black/[0.2] dark:hover:border-white/[0.2] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]',
            ].join(' ')}
          >
            {isPro ? 'Pro ✦' : 'Pro'}
          </button>

          {/* Skin toggle — Pro only */}
          <button
            onClick={() => isPro ? setSkin(skin === 'classic' ? 'pro' : 'classic') : onProClick()}
            title={
              !isPro            ? 'Elemental skin — Pro feature'
              : skin === 'pro'  ? 'Switch to Classic skin'
                                : 'Switch to Elemental skin'
            }
            className={[
              'px-3 py-1.5 rounded-md text-xs font-normal tracking-tight',
              'transition-all duration-200 ease-out active:scale-95',
              skin === 'pro'
                ? 'border border-black/[0.15] dark:border-white/[0.15] text-neutral-800 dark:text-neutral-200 bg-black/[0.05] dark:bg-white/[0.06]'
                : isPro
                ? 'border border-black/[0.1] dark:border-white/[0.1] hover:border-black/[0.2] dark:hover:border-white/[0.2] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                : 'border border-black/[0.07] dark:border-white/[0.07] text-neutral-500 dark:text-neutral-700 cursor-pointer hover:text-neutral-800 dark:hover:text-neutral-500',
            ].join(' ')}
          >
            {skin === 'pro'
              ? '✦ elemental'
              : <span className="flex items-center gap-1.5">
                  <Layers size={11} strokeWidth={1.5} />
                  {!isPro ? 'classic ✦' : 'classic'}
                </span>}
          </button>

          {/* Hint */}
          <button onClick={getHint} className={actionBtn(hintedId !== null)} title="Show a hint">
            ◎
          </button>

          {/* Undo — Pro only */}
          {isPro && (
            <button
              onClick={undoMove}
              disabled={history.length === 0}
              className={`${actionBtn()} disabled:opacity-20 disabled:cursor-not-allowed`}
              title="Undo last match"
            >
              ↺
            </button>
          )}

          {/* Sprint — Pro only */}
          {isPro && (
            <button
              onClick={() => setSprintMode(!sprintMode)}
              title={sprintMode ? 'Exit sprint mode' : 'Sprint: clear as many pairs as possible in 3 minutes'}
              className={[
                'px-3 py-1.5 rounded-md text-xs font-normal tracking-tight',
                'transition-all duration-200 ease-out active:scale-95',
                sprintMode
                  ? sprintUrgent
                    ? 'border border-red-500/[0.5] text-red-400 bg-red-500/[0.06] animate-pulse'
                    : 'border border-amber-500/[0.4] text-amber-400 bg-amber-500/[0.05]'
                  : 'text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.03]',
              ].join(' ')}
            >
              {sprintMode ? `⏱ ${mm}:${ss}` : '⏱ sprint'}
            </button>
          )}

          {/* Shuffle */}
          <button
            onClick={reshuffleRemaining}
            title={isDeadlock ? 'No moves left — reshuffling tiles' : 'Reshuffle remaining tiles'}
            className={shuffleBtn}
          >
            {isDeadlock ? '↺ stuck?' : 'shuffle'}
          </button>

          {/* Restart */}
          <button
            onClick={handleRestart}
            title={restartArmed ? 'Click again to confirm restart' : 'Restart game'}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-normal tracking-tight',
              'transition-all duration-200 ease-out active:scale-95',
              restartArmed
                ? 'text-red-500 dark:text-red-400 border border-red-500/[0.4] bg-red-500/[0.06]'
                : 'text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.03]',
            ].join(' ')}
          >
            <RotateCcw size={11} strokeWidth={2} />
            {restartArmed ? 'sure?' : 'restart'}
          </button>
        </div>
      </div>

      {/* ── Mobile layout (< sm) ─────────────────────────────────────── */}
      <div className="sm:hidden">
        {/* Row 1: brand | stats | pro + rules */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {/* Brand + profile */}
          <div className="flex items-center gap-2 min-w-0">
            <Brand />
            <button
              onClick={onProfileClick}
              className="text-[10px] font-normal tracking-tight text-neutral-500 dark:text-neutral-700
                         hover:text-neutral-900 dark:hover:text-neutral-300 transition-colors duration-150 truncate max-w-[64px]"
              title="Edit profile"
            >
              {nickname || 'anon'}
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5">
            <Stat label="time"  value={`${mm}:${ss}`} />
            <Stat label="pairs" value={isComplete ? '—' : String(pairsLeft)} highlight={isComplete} />
          </div>

          {/* Skin + Pro + Rules */}
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <ThemeToggle />

            {/* Skin toggle — Pro only */}
            <button
              onClick={() => isPro ? setSkin(skin === 'classic' ? 'pro' : 'classic') : onProClick()}
              title={!isPro ? 'Elemental skin — Pro feature' : skin === 'pro' ? 'Switch to Classic' : 'Switch to Elemental'}
              className={[
                'px-2 py-1.5 rounded-md text-[11px] font-normal tracking-tight',
                'transition-all duration-200 ease-out active:scale-95',
                skin === 'pro'
                  ? 'border border-black/[0.15] dark:border-white/[0.15] text-neutral-800 dark:text-neutral-200 bg-black/[0.05] dark:bg-white/[0.06]'
                  : isPro
                  ? 'border border-black/[0.1] dark:border-white/[0.1] text-neutral-500 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  : 'border border-black/[0.07] dark:border-white/[0.07] text-neutral-500 dark:text-neutral-700',
              ].join(' ')}
            >
              {skin === 'pro' ? '✦' : <Layers size={12} strokeWidth={1.5} />}
            </button>
            <button
              onClick={onRulesClick}
              className="w-8 h-8 flex items-center justify-center rounded-md
                         text-xs text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300
                         hover:bg-black/[0.04] dark:hover:bg-white/[0.03] transition-all duration-200"
              aria-label="Rules"
            >
              ?
            </button>
            <button
              onClick={onProClick}
              className={[
                'px-2.5 py-1.5 rounded-md text-xs font-normal tracking-tight',
                'transition-all duration-200 ease-out active:scale-95',
                isPro
                  ? 'border border-black/[0.15] dark:border-white/[0.15] text-neutral-800 dark:text-neutral-200 bg-black/[0.05] dark:bg-white/[0.06]'
                  : 'border border-black/[0.1] dark:border-white/[0.1] text-neutral-500 dark:text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200',
              ].join(' ')}
            >
              {isPro ? '✦' : 'Pro'}
            </button>
          </div>
        </div>

        {/* Row 2: difficulty | tools */}
        <div className="flex items-center justify-between px-4 pb-3">
          {/* Difficulty */}
          <div className="flex items-center rounded-md border border-black/[0.08] dark:border-white/[0.07] overflow-hidden">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={diffBtn(d)}>{d}</button>
            ))}
          </div>

          {/* Tools */}
          <div className="flex items-center gap-1">
            <button
              onClick={getHint}
              className={`w-8 h-8 flex items-center justify-center rounded-md text-sm
                          transition-all duration-200 active:scale-95
                          ${hintedId !== null
                            ? 'text-neutral-800 dark:text-neutral-300 bg-black/[0.05] dark:bg-white/[0.05] border border-black/[0.1] dark:border-white/[0.12]'
                            : 'text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.03]'}`}
              title="Hint"
            >
              ◎
            </button>

            {isPro && (
              <button
                onClick={undoMove}
                disabled={history.length === 0}
                className="w-8 h-8 flex items-center justify-center rounded-md text-sm
                           text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.03]
                           transition-all duration-200 active:scale-95
                           disabled:opacity-20 disabled:cursor-not-allowed"
                title="Undo"
              >
                ↺
              </button>
            )}

            <button
              onClick={reshuffleRemaining}
              title={isDeadlock ? 'No moves — reshuffling' : 'Reshuffle'}
              className={[
                'px-2.5 py-1.5 rounded-md text-[10px] font-normal tracking-tight',
                'transition-all duration-200 ease-out active:scale-95',
                isDeadlock
                  ? 'border border-black/[0.2] dark:border-white/[0.2] text-neutral-800 dark:text-neutral-200 bg-black/[0.05] dark:bg-white/[0.06] animate-pulse'
                  : 'text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.03]',
              ].join(' ')}
            >
              {isDeadlock ? '↺ stuck?' : 'shuffle'}
            </button>

            {/* Restart — icon only on mobile */}
            <button
              onClick={handleRestart}
              title={restartArmed ? 'Click again to confirm' : 'Restart game'}
              className={[
                'w-8 h-8 flex items-center justify-center rounded-md',
                'transition-all duration-200 ease-out active:scale-95',
                restartArmed
                  ? 'text-red-500 dark:text-red-400 border border-red-500/[0.4] bg-red-500/[0.06]'
                  : 'text-neutral-500 dark:text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.03]',
              ].join(' ')}
            >
              <RotateCcw size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------

function Brand() {
  return (
    <div className="flex items-baseline gap-1 shrink-0">
      <span className="text-sm font-normal tracking-tight text-neutral-900 dark:text-neutral-200">Mahjong</span>
      <span className="text-sm font-light tracking-tight text-neutral-500">Flow</span>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  urgent    = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  urgent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[9px] uppercase tracking-[0.12em] text-neutral-700 font-normal">
        {label}
      </span>
      <span
        className={`text-sm font-light tabular-nums tracking-tight ${
          urgent    ? 'text-red-400 animate-pulse' :
          highlight ? 'text-neutral-900 dark:text-neutral-200' :
                      'text-neutral-600 dark:text-neutral-400'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
