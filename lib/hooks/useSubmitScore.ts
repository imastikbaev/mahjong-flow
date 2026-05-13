'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface SubmitPayload {
  userId:      string;
  nickname:    string;
  city:        string;
  timeSeconds: number;
  type:        'daily' | 'practice';
}

interface UseSubmitScoreResult {
  submit:     (payload: SubmitPayload) => Promise<void>;
  submitting: boolean;
  error:      string | null;
  submitted:  boolean;
}

function computeScore(timeSeconds: number): number {
  return Math.max(0, 10_000 - timeSeconds * 5);
}

/**
 * Submits a completed game score to Supabase.
 *
 * Step 1 — upsert the player's profile into `users` (nickname + city stay fresh).
 * Step 2 — upsert the score into `leaderboard`.
 *          The unique constraint (user_id, date, type) keeps only the best score.
 */
export function useSubmitScore(): UseSubmitScoreResult {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [submitted, setSubmitted]   = useState(false);

  const submit = useCallback(async ({ userId, nickname, city, timeSeconds, type }: SubmitPayload) => {
    if (!userId) return;

    setSubmitting(true);
    setError(null);

    const today = new Date().toISOString().slice(0, 10);
    const score = computeScore(timeSeconds);

    try {
      // 1. Upsert user profile so nickname / city are always up to date
      const { error: userErr } = await supabase
        .from('users')
        .upsert(
          { id: userId, nickname: nickname.trim() || 'anonymous', city: city || null, is_pro: false },
          { onConflict: 'id' },
        );
      if (userErr) throw userErr;

      // 2. Upsert score — keeps only best (highest score) via ignoreDuplicates: false
      const { error: scoreErr } = await supabase
        .from('leaderboard')
        .upsert(
          { user_id: userId, date: today, time_seconds: timeSeconds, score, type },
          { onConflict: 'user_id,date,type', ignoreDuplicates: false },
        );
      if (scoreErr) throw scoreErr;

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit score.');
      console.error('[useSubmitScore]', err);
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error, submitted };
}
