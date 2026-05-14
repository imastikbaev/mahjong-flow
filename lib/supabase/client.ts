import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 * Call once per component tree — import this, not the legacy supabaseClient.ts,
 * whenever you need auth or row-level-secure queries from the browser.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
}
