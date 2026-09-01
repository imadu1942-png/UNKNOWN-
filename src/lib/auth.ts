import { supabase, isSupabaseConfigured } from './supabase';

export const DEFAULT_READER_EMAIL =
  import.meta.env.VITE_READER_EMAIL || 'reader@chithidibosh.com';

export const VALID_USER_PASSWORD = '3485';
export const VALID_ADMIN_EMAIL = 'imu29306@gmail.com';
export const VALID_ADMIN_PASSWORD = 'admin29306';

const ADMIN_SESSION_KEY = 'chithi_admin_session_v1';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: any;
}

/**
 * User (Reader) Login:
 * Authenticates user using the secret letter passcode (3485) and Supabase Auth.
 */
export async function signInAsReader(password: string): Promise<AuthResult> {
  const cleanPassword = password.trim();
  if (!cleanPassword) {
    return { success: false, error: 'অনুগ্রহ করে পাসওয়ার্ড লিখুন' };
  }

  // Check against the configured user passcode
  const isMatch = cleanPassword === VALID_USER_PASSWORD;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: DEFAULT_READER_EMAIL,
        password: cleanPassword,
      });

      if (!error && data?.user) {
        return {
          success: true,
          user: data.user,
        };
      }
    } catch {
      // Continue to fallback check
    }
  }

  if (isMatch) {
    return {
      success: true,
      user: { role: 'reader', email: DEFAULT_READER_EMAIL },
    };
  }

  return {
    success: false,
    error: 'পাসওয়ার্ড সঠিক নয়। দয়া করে সঠিক পাসওয়ার্ড দিন।',
  };
}

/**
 * Admin Login:
 * Authenticates admin with username imu29306@gmail.com and password admin29306
 * via Supabase Auth and secure admin verification.
 */
export async function signInAsAdmin(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    return { success: false, error: 'ইমেইল এবং পাসওয়ার্ড উভয়ই আবশ্যক' };
  }

  const isCredentialsMatch =
    cleanEmail === VALID_ADMIN_EMAIL.toLowerCase() &&
    cleanPassword === VALID_ADMIN_PASSWORD;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (!error && data?.user) {
        const adminUser = { ...data.user, role: 'authenticated' };
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminUser));
        return {
          success: true,
          user: adminUser,
        };
      }
    } catch {
      // Continue to fallback verification
    }
  }

  if (isCredentialsMatch) {
    const adminUser = {
      email: VALID_ADMIN_EMAIL,
      role: 'authenticated',
      id: 'admin_verified_session',
    };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminUser));
    return {
      success: true,
      user: adminUser,
    };
  }

  return {
    success: false,
    error: 'ভুল অ্যাডমিন ইমেইল অথবা পাসওয়ার্ড!',
  };
}

/**
 * Sign out current session
 */
export async function signOut(): Promise<void> {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  if (supabase && isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  }
}

/**
 * Check if there is an active session
 */
export async function getCurrentUser() {
  if (supabase && isSupabaseConfigured) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) return data.user;
    } catch {
      // Check session storage
    }
  }
  const localSession = sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (localSession) {
    try {
      return JSON.parse(localSession);
    } catch {
      return null;
    }
  }
  return null;
}

