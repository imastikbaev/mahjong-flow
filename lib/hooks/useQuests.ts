'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient }                      from '@/lib/supabase/client';
import { QUESTS, getExpiresAt, type QuestDef } from '@/lib/quests';
import type { User }                         from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// DB row type — mirrors the quests_progress SQL schema exactly.
// ---------------------------------------------------------------------------

interface DbQuestProgress {
  id:            string;
  user_id:       string;
  quest_id:      string;
  target_value:  number;
  current_value: number;
  expires_at:    string;
  is_completed:  boolean;
  created_at:    string;
  updated_at:    string;
}

// RPC return shape for increment_quest_progress()
interface RpcIncrementResult {
  current_value: number;
  is_completed:  boolean;
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface QuestProgress extends QuestDef {
  currentValue: number;
  isCompleted:  boolean;
  expiresAt:    string;
}

// ---------------------------------------------------------------------------

export function useQuests(user: User | null | undefined) {
  const [quests, setQuests] = useState<QuestProgress[]>([]);

  // ── Sync: ensure a fresh row exists for every quest definition ────────────
  const syncQuests = useCallback(async () => {
    if (!user) { setQuests([]); return; }

    const supabase = createClient();

    const { data: rows } = await supabase
      .from('quests_progress')
      .select('*')
      .eq('user_id', user.id);

    const existing = new Map(
      (rows as DbQuestProgress[] ?? []).map((r) => [r.quest_id, r]),
    );

    const now = new Date().toISOString();

    // Build upsert list: rows that are missing or have expired.
    const upserts = QUESTS
      .filter((q) => {
        const row = existing.get(q.id);
        return !row || row.expires_at < now;
      })
      .map((q) => ({
        user_id:       user.id,
        quest_id:      q.id,
        target_value:  q.target,
        current_value: 0,
        expires_at:    getExpiresAt(q.period),
        is_completed:  false,
      }));

    if (upserts.length > 0) {
      await supabase
        .from('quests_progress')
        .upsert(upserts, { onConflict: 'user_id,quest_id' });
    }

    // Re-fetch the merged state after upsert.
    const { data: fresh } = await supabase
      .from('quests_progress')
      .select('*')
      .eq('user_id', user.id);

    const freshMap = new Map(
      (fresh as DbQuestProgress[] ?? []).map((r) => [r.quest_id, r]),
    );

    setQuests(
      QUESTS.map((q) => {
        const row = freshMap.get(q.id);
        return {
          ...q,
          currentValue: row?.current_value  ?? 0,
          isCompleted:  row?.is_completed   ?? false,
          expiresAt:    row?.expires_at     ?? getExpiresAt(q.period),
        };
      }),
    );
  }, [user]);

  useEffect(() => { syncQuests(); }, [syncQuests]);

  // ── Update: atomic increment via PL/pgSQL function ────────────────────────
  //
  // Replaces the previous read-then-write pattern.
  // increment_quest_progress() acquires a row-level lock (FOR UPDATE) inside
  // a single transaction, so concurrent game events cannot interleave and
  // produce double-increments or lost writes.
  const updateProgress = useCallback(
    async (questId: string, amount: number) => {
      if (!user) return;

      const supabase = createClient();

      const { data } = await supabase.rpc('increment_quest_progress', {
        u_id:    user.id,
        q_id:    questId,
        inc_val: amount,
      });

      // RPC returns an empty array when the row is missing or already complete.
      if (!data || (data as RpcIncrementResult[]).length === 0) return;

      const { current_value, is_completed } = (data as RpcIncrementResult[])[0];

      // Optimistic local update — no extra network round-trip needed.
      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId
            ? { ...q, currentValue: current_value, isCompleted: is_completed }
            : q,
        ),
      );
    },
    [user],
  );

  return { quests, updateProgress, refetch: syncQuests };
}
