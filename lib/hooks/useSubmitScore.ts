'use client';

import { useState, useCallback } from 'react';
import { supabase, DbLeaderboardEntry } from '@/lib/supabaseClient';

type LeaderboardInsert = Omit<DbLeaderboardEntry, 'id' | 'created_at'>;

interface SubmitPayload {
  userId: string;
  timeSeconds: number;
  type: 'daily' | 'practice';
}

interface UseSubmitScoreResult {
  submit: (payload: SubmitPayload) => Promise<void>;
  submitting: boolean;
  error: string | null;
  submitted: boolean;
}

/**
 * Score formula:  score = max(0, 10_000 − timeSeconds × 5)
 *
 * We upsert so replaying a daily challenge only ever keeps the best score.
 * The DB unique constraint on (user_id, date, type) guarantees idempotency.
 */
function computeScore(timeSeconds: number): number {
  return Math.max(0, 10_000 - timeSeconds * 5);
}

export function useSubmitScore(): UseSubmitScoreResult {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [submitted, setSubmitted]   = useState(false);

  const submit = useCallback(async ({ userId, timeSeconds, type }: SubmitPayload) => {
    setSubmitting(true);
    setError(null);

    const today = new Date().toISOString().slice(0, 10);
    const score = computeScore(timeSeconds);

    // Explicitly typed so the compiler never has to infer through Supabase generics.
    const payload: LeaderboardInsert = {
      user_id:      userId,
      date:         today,
      time_seconds: timeSeconds,
      score,
      type,
    };

    try {
      const { error: sbError } = await supabase
        .from('leaderboard')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(payload as any, {
          onConflict:       'user_id,date,type',
          ignoreDuplicates: false,
        });

      if (sbError) throw sbError;
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit score.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error, submitted };
}
