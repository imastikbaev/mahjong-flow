import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Row types — mirror the SQL schema exactly
// ---------------------------------------------------------------------------

export interface DbUser {
  id: string;
  nickname: string;
  city: string | null;
  is_pro: boolean;
  created_at: string;
}

export interface DbLeaderboardEntry {
  id: string;
  user_id: string;
  date: string;
  time_seconds: number;
  score: number;
  type: 'daily' | 'practice';
  created_at: string;
}

/** Shape returned by the leaderboard join query (entry + joined user profile). */
export interface LeaderboardRow extends DbLeaderboardEntry {
  users: Pick<DbUser, 'nickname' | 'city'>;
}

// ---------------------------------------------------------------------------
// Database generic — Supabase v2 requires Views, Functions, and Enums keys
// to exist even if empty; omitting them breaks the type inference for upsert.
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      users: {
        Row: DbUser;
        Insert: Omit<DbUser, 'created_at'>;
        Update: Partial<Omit<DbUser, 'id' | 'created_at'>>;
        Relationships: [];
      };
      leaderboard: {
        Row: DbLeaderboardEntry;
        Insert: Omit<DbLeaderboardEntry, 'id' | 'created_at'>;
        Update: Partial<Pick<DbLeaderboardEntry, 'time_seconds' | 'score'>>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type TypedSupabaseClient = SupabaseClient;

// ---------------------------------------------------------------------------
// Singleton client — lazy so missing env vars don't crash the build.
// At runtime, calls will fail gracefully if vars are absent; set them via
// Vercel Dashboard → Project Settings → Environment Variables.
// ---------------------------------------------------------------------------

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (_client) return _client;

  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    // Warn at runtime but don't crash the process — the app still renders
    // without DB connectivity (leaderboard shows empty, score submit fails).
    console.warn(
      '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. ' +
      'Add them in Vercel → Project Settings → Environment Variables.',
    );
  }

  _client = createClient(url ?? '', anon ?? '');
  return _client;
}

// Proxy so all imports keep `supabase.from(...)` syntax unchanged.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
