import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe helper to extract and clean environment variables across multiple environments
function cleanEnvString(val: any): string {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/^["'`]|["'`]$/g, '') // strip wrapping quotes if passed in env
    .trim();
}

function getEnvVar(keyNames: string[]): string {
  for (const key of keyNames) {
    // 1. Check import.meta.env
    try {
      const val = (import.meta as any).env?.[key];
      const cleaned = cleanEnvString(val);
      if (cleaned) return cleaned;
    } catch {}

    // 2. Check process.env (Node / container runtime)
    try {
      if (typeof process !== 'undefined' && process?.env) {
        const val = process.env[key];
        const cleaned = cleanEnvString(val);
        if (cleaned) return cleaned;
      }
    } catch {}

    // 3. Check window / global scope
    try {
      if (typeof window !== 'undefined') {
        const win = window as any;
        const val = win?.__ENV__?.[key] || win?.env?.[key] || win?.[key];
        const cleaned = cleanEnvString(val);
        if (cleaned) return cleaned;
      }
    } catch {}
  }
  return '';
}

function normalizeSupabaseUrl(url: string): string {
  let cleaned = cleanEnvString(url);
  if (!cleaned) return '';

  // Remove trailing /rest/v1 or trailing slashes
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');

  // Prepend https:// if protocol is missing (e.g. xyz.supabase.co)
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  return cleaned;
}

// 1. Extract Supabase URL from environment variables
const rawSupabaseUrl = getEnvVar([
  'VITE_SUPABASE_URL',
  'VITE_PUBLIC_SUPABASE_URL',
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'REACT_APP_SUPABASE_URL',
]);

export const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

// 2. Extract Supabase Anon / Publishable Key from environment variables
export const supabaseAnonKey = getEnvVar([
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_KEY',
  'VITE_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'REACT_APP_SUPABASE_ANON_KEY',
]);

// 3. Configuration check: True if both valid URL and Key are detected
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.length > 8 &&
  supabaseAnonKey.length > 8
);

// 4. Initialize Supabase client
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;



