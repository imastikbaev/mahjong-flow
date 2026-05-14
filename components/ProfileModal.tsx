'use client';

import { useState, useEffect } from 'react';
import Modal from './Modal';
import { createClient } from '@/lib/supabase/client';
import { UserProfile, CITIES } from '@/lib/hooks/useProfile';
import type { User } from '@supabase/supabase-js';

interface ProfileModalProps {
  isOpen:  boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave:  (updates: Partial<UserProfile>) => void;
  user?:   User | null;
  onSignInClick?: () => void;
}

type Tab = 'profile' | 'history';

interface HistoryRow {
  id:           string;
  date:         string;
  score:        number;
  time_seconds: number;
  type:         string;
}

export default function ProfileModal({ isOpen, onClose, profile, onSave, user, onSignInClick }: ProfileModalProps) {
  const [tab,      setTab]      = useState<Tab>('profile');
  const [nickname, setNickname] = useState(profile.nickname);
  const [city,     setCity]     = useState(profile.city);
  const [history,  setHistory]  = useState<HistoryRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (isOpen) { setNickname(profile.nickname); setCity(profile.city); }
  }, [isOpen, profile.nickname, profile.city]);

  useEffect(() => {
    if (tab !== 'history' || !user) return;
    setHistLoading(true);
    createClient()
      .from('leaderboard')
      .select('id, date, score, time_seconds, type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setHistory(data ?? []); setHistLoading(false); });
  }, [tab, user]);

  function handleSave() { onSave({ nickname: nickname.trim(), city }); onClose(); }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${String(s % 60).padStart(2,'0')}s` : `${s}s`;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      {/* Header */}
      <div className="relative px-6 pt-7 pb-0 border-b border-black/[0.06] dark:border-white/[0.06]
                      bg-neutral-50 dark:bg-[#111111]">
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-neutral-500 dark:text-neutral-600
                     hover:text-neutral-900 dark:hover:text-neutral-300
                     transition-colors duration-150 text-base leading-none"
          aria-label="Close"
        >
          ✕
        </button>
        <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-600 font-normal mb-2">
          {user ? (user.user_metadata?.full_name ?? user.email) : 'Profile'}
        </p>
        <h2 className="text-xl font-light tracking-tight text-neutral-900 dark:text-neutral-100 mb-4">
          Your identity.
        </h2>

        {/* Tabs */}
        <div className="flex gap-0 -mb-px">
          {(['profile', 'history'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                'px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-normal border-b-2 transition-colors duration-150',
                tab === t
                  ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-neutral-100'
                  : 'border-transparent text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-400',
              ].join(' ')}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="bg-white dark:bg-[#0e0e0e]">
        {tab === 'profile' && (
          <div className="px-6 py-5 space-y-4">
            {/* Nickname */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-600 font-normal">
                Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                maxLength={24}
                placeholder="anonymous"
                className="
                  w-full px-3 py-2.5 rounded-lg
                  bg-black/[0.03] dark:bg-white/[0.04]
                  border border-black/[0.08] dark:border-white/[0.08]
                  text-sm font-normal text-neutral-800 dark:text-neutral-200
                  placeholder:text-neutral-400 dark:placeholder:text-neutral-700
                  tracking-tight focus:outline-none
                  focus:border-black/[0.2] dark:focus:border-white/[0.2]
                  transition-colors duration-150
                "
              />
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-600 font-normal">
                Region
              </label>
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="
                    w-full px-3 py-2.5 rounded-lg appearance-none
                    bg-black/[0.03] dark:bg-white/[0.04]
                    border border-black/[0.08] dark:border-white/[0.08]
                    text-sm font-normal text-neutral-800 dark:text-neutral-200
                    tracking-tight focus:outline-none
                    focus:border-black/[0.2] dark:focus:border-white/[0.2]
                    transition-colors duration-150 cursor-pointer
                  "
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2
                                 text-neutral-400 dark:text-neutral-600 text-xs">▾</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="
                w-full py-2.5 rounded-lg text-sm font-normal tracking-tight
                bg-neutral-900 text-white hover:bg-neutral-800
                dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-100
                transition-colors duration-150
              "
            >
              Save
            </button>

            {!user && onSignInClick && (
              <button
                onClick={() => { onClose(); onSignInClick(); }}
                className="w-full text-center text-xs font-light text-neutral-400 dark:text-neutral-600
                           hover:text-neutral-700 dark:hover:text-neutral-400 transition-colors duration-150"
              >
                Sign in with Google to save history →
              </button>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="px-4 py-4 min-h-[200px]">
            {!user ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-xs font-light text-neutral-500 dark:text-neutral-400 tracking-tight">
                  Sign in to see your personal game history.
                </p>
                {onSignInClick && (
                  <button
                    onClick={() => { onClose(); onSignInClick(); }}
                    className="
                      px-4 py-2 rounded-lg text-xs font-normal tracking-tight
                      bg-neutral-900 text-white hover:bg-neutral-800
                      dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-100
                      transition-colors duration-150
                    "
                  >
                    Sign in ✦
                  </button>
                )}
              </div>
            ) : histLoading ? (
              <div className="space-y-2 animate-pulse py-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <div className="h-3 rounded bg-black/[0.05] dark:bg-white/[0.05] w-16" />
                    <div className="flex-1 h-3 rounded bg-black/[0.05] dark:bg-white/[0.05]" />
                    <div className="h-3 rounded bg-black/[0.05] dark:bg-white/[0.05] w-12" />
                  </div>
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs font-light text-neutral-400 dark:text-neutral-600 tracking-tight">
                  No games recorded yet — complete a Daily Challenge.
                </p>
              </div>
            ) : (
              <ol className="space-y-0.5">
                {history.map((row) => (
                  <li key={row.id}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg
                                 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]
                                 transition-colors duration-150">
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-600 w-20 shrink-0 tabular-nums">
                      {row.date}
                    </span>
                    <span className="flex-1 text-[10px] text-neutral-400 dark:text-neutral-600 capitalize">
                      {row.type}
                    </span>
                    <span className="text-xs font-normal text-neutral-700 dark:text-neutral-300 tabular-nums">
                      {row.score.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-600 tabular-nums w-14 text-right">
                      {formatTime(row.time_seconds)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
