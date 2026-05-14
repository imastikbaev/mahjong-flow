// ---------------------------------------------------------------------------
// Quest definitions — single source of truth.
// IDs are stable strings used as foreign keys in quests_progress.
// ---------------------------------------------------------------------------

export type QuestPeriod = 'daily' | 'weekly';

export interface QuestDef {
  id:          string;
  period:      QuestPeriod;
  title:       string;
  description: string;
  /** How many units are needed to complete the quest. */
  target:      number;
  /** Unit label shown in the UI (e.g. "games", "pairs"). */
  unit:        string;
  reward:      string;
}

export const QUESTS: QuestDef[] = [
  // ── Daily ────────────────────────────────────────────────────────────────
  {
    id:          'daily_complete_challenge',
    period:      'daily',
    title:       'Daily Challenger',
    description: 'Complete 1 Daily Challenge.',
    target:      1,
    unit:        'games',
    reward:      '+50 Flow Points',
  },
  {
    id:          'daily_sprint_3',
    period:      'daily',
    title:       'Sprint Session',
    description: 'Play 3 Sprint matches.',
    target:      3,
    unit:        'sprints',
    reward:      '+30 Flow Points',
  },
  {
    id:          'daily_pairs_50',
    period:      'daily',
    title:       'Pair Streak',
    description: 'Clear 50 pairs in any mode.',
    target:      50,
    unit:        'pairs',
    reward:      '+20 Flow Points',
  },

  // ── Weekly ───────────────────────────────────────────────────────────────
  {
    id:          'weekly_score_8000',
    period:      'weekly',
    title:       'Flow State',
    description: 'Achieve a score of 8 000+ in a single game.',
    target:      1,
    unit:        'games',
    reward:      'Flow Badge ✦',
  },
  {
    id:          'weekly_pairs_500',
    period:      'weekly',
    title:       'Tile Master',
    description: 'Clear 500 pairs total across any modes.',
    target:      500,
    unit:        'pairs',
    reward:      '+200 Flow Points',
  },
  {
    id:          'weekly_daily_7',
    period:      'weekly',
    title:       'Committed',
    description: 'Complete the Daily Challenge 7 days in a row.',
    target:      7,
    unit:        'days',
    reward:      'Streak Badge ◆',
  },
];

/** Get the UTC reset timestamp for a quest period. */
export function getExpiresAt(period: QuestPeriod): string {
  const now = new Date();
  if (period === 'daily') {
    // Midnight UTC tonight
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return d.toISOString();
  }
  // Weekly — next Monday 00:00 UTC
  const dayOfWeek = now.getUTCDay(); // 0=Sun
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
  return d.toISOString();
}
