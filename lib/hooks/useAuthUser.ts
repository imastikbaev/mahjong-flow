'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Lightweight hook that mirrors the current Supabase auth session.
 * Returns `null` while loading and `undefined` when confirmed logged-out.
 */
export function useAuthUser() {
  const [user, setUser]       = useState<User | null | undefined>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Initial session check
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? undefined);
      setLoading(false);
    });

    // Live updates (sign-in / sign-out from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? undefined);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
