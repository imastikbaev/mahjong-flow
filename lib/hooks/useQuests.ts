'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { QUESTS, getExpiresAt, type QuestDef } from '@/lib/quests';
import type { User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------

export interface QuestProgress extends QuestDef {
  currentValue: number;
  isCompleted:  boolean;
  expiresAt:    string;
}

// ---------------------------------------------------------------------------

export function useQuests(user: User | null | undefined) {
  const [quests, setQuests] = useState<QuestProgress[]>([]);

  // Ensure a row exists for every quest, bootstrapping expired ones.
  const syncQuests = useCallback(async () => {
    if (!user) { setQuests([]); return; }
    const supabase = createClient();

    const { data: rows } = await supabase
      .from('quests_progress')
      .select('*')
      .eq('user_id', user.id);

    const existing = new Map((rows ?? []).map((r: Record<string,unknown>) => [r.quest_id as string, r]));
    const now      = new Date().toISOString();

    const upserts = QUESTS.map((q) => {
      const row = existing.get(q.id);
      // Row missing or expired → reset
      if (!row || (row.expires_at as string) < now) {
        return {
          user_id:       user.id,
          quest_id:      q.id,
          target_value:  q.target,
          current_value: 0,
          expires_at:    getExpiresAt(q.period),
          is_completed:  false,
        };
      }
      return null;
    }).filter((x): x is NonNullable<typeof x> => x !== null);

    if (upserts.length > 0) {
      await supabase.from('quests_progress').upsert(upserts, {
        onConflict: 'user_id,quest_id',
      });
    }

    // Re-fetch merged state
    const { data: fresh } = await supabase
      .from('quests_progress')
      .select('*')
      .eq('user_id', user.id);

    const freshMap = new Map((fresh ?? []).map((r: Record<string,unknown>) => [r.quest_id as string, r]));

    setQuests(
      QUESTS.map((q) => {
        const row = freshMap.get(q.id);
        return {
          ...q,
          currentValue: Number(row?.current_value ?? 0),
          isCompleted:  Boolean(row?.is_completed ?? false),
          expiresAt:    String(row?.expires_at ?? getExpiresAt(q.period)),
        };
      }),
    );
  }, [user]);

  useEffect(() => { syncQuests(); }, [syncQuests]);

  // Call this from game events (pair cleared, game won, etc.)
  const updateProgress = useCallback(
    async (questId: string, amount: number) => {
      if (!user) return;
      const supabase = createClient();
      const def = QUESTS.find((q) => q.id === questId);
      if (!def) return;

      const { data: row } = await supabase
        .from('quests_progress')
        .select('current_value, is_completed, target_value')
        .eq('user_id', user.id)
        .eq('quest_id', questId)
        .single();

      if (!row || row.is_completed) return;

      const newValue = Math.min(Number(row.current_value) + amount, Number(row.target_value));
      const isDone   = newValue >= Number(row.target_value);

      await supabase
        .from('quests_progress')
        .update({ current_value: newValue, is_completed: isDone })
        .eq('user_id', user.id)
        .eq('quest_id', questId);

      setQuests((prev) =>
        prev.map((q) =>
          q.id === questId ? { ...q, currentValue: newValue, isCompleted: isDone } : q,
        ),
      );
    },
    [user],
  );

  return { quests, updateProgress, refetch: syncQuests };
}
