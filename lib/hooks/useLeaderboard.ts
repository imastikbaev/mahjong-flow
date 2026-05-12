'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, LeaderboardRow } from '@/lib/supabaseClient';

export type LeaderboardScope = 'global' | 'local';

interface UseLeaderboardOptions {
  date: string;           // "YYYY-MM-DD"
  scope: LeaderboardScope;
  city?: string | null;   // required when scope === 'local'
  limit?: number;
}

interface UseLeaderboardResult {
  rows: LeaderboardRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches the top-N leaderboard entries for a given date.
 *
 * Global scope  → all cities, ordered by score desc, then time_seconds asc.
 * Local scope   → same query but filtered to users whose city matches `city`.
 *
 * The join `users(nickname, city)` is resolved server-side by Supabase's
 * PostgREST foreign-key embedding — no extra round-trips needed.
 */
export function useLeaderboard({
  date,
  scope,
  city,
  limit = 10,
}: UseLeaderboardOptions): UseLeaderboardResult {
  const [rows, setRows]       = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build the filter chain first, then terminate with .returns<T>()
      // (.returns() produces a PostgrestTransformBuilder that has no .eq(),
      //  so all filters must come before it).
      let filterQuery = supabase
        .from('leaderboard')
        .select('*, users(nickname, city)')
        .eq('date', date)
        .eq('type', 'daily')
        .order('score', { ascending: false })
        .order('time_seconds', { ascending: true })
        .limit(limit);

      if (scope === 'local' && city) {
        filterQuery = filterQuery.eq('users.city', city);
      }

      const { data, error: sbError } = await filterQuery.returns<LeaderboardRow[]>();

      if (sbError) throw sbError;
      setRows(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [date, scope, city, limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { rows, loading, error, refetch: fetch };
}
