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

// Kept for documentation; replace with Supabase CLI-generated types
// (`supabase gen types typescript`) once the project is linked.
export type TypedSupabaseClient = SupabaseClient;

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Copy .env.local.example → .env.local and fill in your project credentials.',
  );
}

// We skip the Database generic here because our hand-written type doesn't
// satisfy Supabase's internal GenericSchema constraint exactly.
// Use `.returns<T>()` on select queries and explicit payload types on writes
// for full type safety. Replace with `createClient<Database>` once you run
// `supabase gen types typescript --project-id <ref> > lib/database.types.ts`.
export const supabase = createClient(supabaseUrl, supabaseAnon);
