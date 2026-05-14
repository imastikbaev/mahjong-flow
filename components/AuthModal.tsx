'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Modal from './Modal';

type Mode = 'choose' | 'sign-in' | 'sign-up';

interface AuthModalProps {
  isOpen:  boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode,     setMode]     = useState<Mode>('choose');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);

  function reset() {
    setEmail(''); setPassword('');
    setError(null); setSuccess(null); setLoading(false);
  }

  function goMode(m: Mode) { reset(); setMode(m); }

  // ── Google OAuth ────────────────────────────────────────────────────────────
  async function handleGoogle() {
    setLoading(true); setError(null);
    const { error: err } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(err.message); setLoading(false); }
  }

  // ── Email sign-in ───────────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError(err.message); return; }
    onClose();
  }

  // ── Email sign-up ───────────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await createClient().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess('Check your email for a confirmation link.');
  }

  // ── Header label ─────────────────────────────────────────────────────────────
  const title    = mode === 'sign-up' ? 'Create account' : 'Enter your flow.';
  const subtitle =
    mode === 'sign-up'
      ? 'Join the leaderboard and track your quests.'
      : 'Save scores, track quests, and compete on the leaderboard.';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">

      {/* Header */}
      <div className="relative px-6 pt-7 pb-5 border-b border-black/[0.06] dark:border-white/[0.06]
                      bg-neutral-50 dark:bg-[#111111]">
        <button
          onClick={onClose}
          className="absolute top-4 right-5 text-neutral-500 dark:text-neutral-600
                     hover:text-neutral-900 dark:hover:text-neutral-300
                     transition-colors duration-150 text-base leading-none"
          aria-label="Close"
        >✕</button>

        {/* Back arrow when in a sub-mode */}
        {mode !== 'choose' && (
          <button
            onClick={() => goMode('choose')}
            className="absolute top-4 left-5 text-neutral-500 dark:text-neutral-600
                       hover:text-neutral-900 dark:hover:text-neutral-300
                       transition-colors duration-150 text-sm leading-none"
            aria-label="Back"
          >← back</button>
        )}

        <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-600 font-normal mb-2">
          {mode === 'sign-up' ? 'Sign up' : 'Sign in'}
        </p>
        <h2 className="text-xl font-light tracking-tight text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
        <p className="mt-1 text-sm font-light text-neutral-500 tracking-tight">
          {subtitle}
        </p>
      </div>

      {/* Body */}
      <div className="px-6 py-6 bg-white dark:bg-[#0e0e0e]">

        {/* ── Choose mode ── */}
        {mode === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="
                w-full flex items-center justify-center gap-3
                py-2.5 rounded-lg text-sm font-normal tracking-tight
                bg-neutral-900 text-white hover:bg-neutral-800
                dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-100
                transition-colors duration-150 active:scale-[0.99]
                disabled:opacity-50 disabled:cursor-wait
              "
            >
              {loading ? <span className="animate-spin text-sm">◌</span> : <GoogleIcon />}
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3 my-1">
              <hr className="flex-1 border-black/[0.07] dark:border-white/[0.07]" />
              <span className="text-[11px] text-neutral-400 dark:text-neutral-600 tracking-tight">or</span>
              <hr className="flex-1 border-black/[0.07] dark:border-white/[0.07]" />
            </div>

            <button
              onClick={() => goMode('sign-in')}
              className="
                w-full py-2.5 rounded-lg text-sm font-normal tracking-tight
                border border-black/[0.1] dark:border-white/[0.1]
                text-neutral-700 dark:text-neutral-300
                hover:border-black/[0.2] dark:hover:border-white/[0.2]
                hover:text-neutral-900 dark:hover:text-neutral-100
                transition-colors duration-150 active:scale-[0.99]
              "
            >
              Sign in with email
            </button>

            <button
              onClick={() => goMode('sign-up')}
              className="
                w-full py-2.5 rounded-lg text-sm font-normal tracking-tight
                border border-black/[0.1] dark:border-white/[0.1]
                text-neutral-700 dark:text-neutral-300
                hover:border-black/[0.2] dark:hover:border-white/[0.2]
                hover:text-neutral-900 dark:hover:text-neutral-100
                transition-colors duration-150 active:scale-[0.99]
              "
            >
              Create account
            </button>

            {error && <p className="text-xs text-red-500 text-center tracking-tight">{error}</p>}

            <p className="text-center text-[11px] font-light text-neutral-500 dark:text-neutral-700 tracking-tight">
              Your game data is stored locally and stays private.
            </p>
          </div>
        )}

        {/* ── Sign-in form ── */}
        {mode === 'sign-in' && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <EmailInput value={email} onChange={setEmail} />
            <PasswordInput value={password} onChange={setPassword} label="Password" />

            {error   && <p className="text-xs text-red-500 tracking-tight">{error}</p>}
            {success && <p className="text-xs text-emerald-500 tracking-tight">{success}</p>}

            <SubmitButton loading={loading} label="Sign in" />

            <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-600 tracking-tight">
              No account?{' '}
              <button type="button" onClick={() => goMode('sign-up')}
                className="underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-300 transition-colors">
                Create one
              </button>
            </p>
          </form>
        )}

        {/* ── Sign-up form ── */}
        {mode === 'sign-up' && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <EmailInput value={email} onChange={setEmail} />
            <PasswordInput value={password} onChange={setPassword} label="Password (min 6 chars)" />

            {error   && <p className="text-xs text-red-500 tracking-tight">{error}</p>}
            {success && <p className="text-xs text-emerald-500 tracking-tight">{success}</p>}

            {!success && <SubmitButton loading={loading} label="Create account" />}

            <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-600 tracking-tight">
              Already have an account?{' '}
              <button type="button" onClick={() => goMode('sign-in')}
                className="underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-300 transition-colors">
                Sign in
              </button>
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
}

// ── Small reusable form pieces ────────────────────────────────────────────────

function EmailInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] text-neutral-500 dark:text-neutral-600 tracking-tight mb-1">
        Email
      </label>
      <input
        type="email" required autoComplete="email"
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
        className="
          w-full px-3 py-2 rounded-lg text-sm font-normal tracking-tight
          bg-neutral-50 dark:bg-white/[0.04]
          border border-black/[0.1] dark:border-white/[0.08]
          text-neutral-900 dark:text-neutral-100
          placeholder:text-neutral-400 dark:placeholder:text-neutral-600
          focus:outline-none focus:border-black/[0.25] dark:focus:border-white/[0.25]
          transition-colors duration-150
        "
      />
    </div>
  );
}

function PasswordInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label className="block text-[11px] text-neutral-500 dark:text-neutral-600 tracking-tight mb-1">
        {label}
      </label>
      <input
        type="password" required autoComplete="current-password" minLength={6}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="
          w-full px-3 py-2 rounded-lg text-sm font-normal tracking-tight
          bg-neutral-50 dark:bg-white/[0.04]
          border border-black/[0.1] dark:border-white/[0.08]
          text-neutral-900 dark:text-neutral-100
          placeholder:text-neutral-400 dark:placeholder:text-neutral-600
          focus:outline-none focus:border-black/[0.25] dark:focus:border-white/[0.25]
          transition-colors duration-150
        "
      />
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit" disabled={loading}
      className="
        w-full flex items-center justify-center gap-2
        py-2.5 rounded-lg text-sm font-normal tracking-tight
        bg-neutral-900 text-white hover:bg-neutral-800
        dark:bg-white dark:text-[#0a0a0a] dark:hover:bg-neutral-100
        transition-colors duration-150 active:scale-[0.99]
        disabled:opacity-50 disabled:cursor-wait
      "
    >
      {loading && <span className="animate-spin text-sm">◌</span>}
      {loading ? 'Please wait…' : label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}
