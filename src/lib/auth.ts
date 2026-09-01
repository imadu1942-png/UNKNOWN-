import { supabase, isSupabaseConfigured } from './supabase';

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
 * Authenticates users using the secret letter passcode (3485).
 * Fully multi-user and multi-device compatible without any fixed reader email dependency.
 */
export async function signInAsReader(password: string): Promise<AuthResult> {
  const cleanPassword = password.trim();
  if (!cleanPassword) {
    return { success: false, error: 'অনুগ্রহ করে পাসওয়ার্ড লিখুন' };
  }

  // Check against the configured user passcode
  const isMatch = cleanPassword === VALID_USER_PASSWORD;

  if (isMatch) {
    const readerSession = {
      id: `reader_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: 'reader',
      authenticated_at: new Date().toISOString(),
    };
    return {
      success: true,
      user: readerSession,
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
      let { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      // If user doesn't exist in Supabase auth yet or signup needed
      if (error && isCredentialsMatch) {
        console.log('[Auth] Admin sign in error, attempting auto signup in Supabase Auth:', error.message);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (!signUpError && signUpData?.user) {
          if (signUpData.session) {
            data = { user: signUpData.user, session: signUpData.session };
            error = null;
          } else {
            // Attempt sign in immediately after signup
            const retryRes = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword,
            });
            if (!retryRes.error && retryRes.data?.user) {
              data = retryRes.data;
              error = null;
            }
          }
        } else if (signUpError) {
          console.warn('[Auth] Supabase auto-signup notice:', signUpError.message);
        }
      }

      if (!error && data?.user) {
        const adminUser = { ...data.user, role: 'authenticated', email: cleanEmail };
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminUser));
        return {
          success: true,
          user: adminUser,
        };
      }
    } catch (err) {
      console.warn('[Auth] Supabase auth attempt notice:', err);
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
 * Ensures the admin has an active Supabase authenticated session before database mutations.
 */
export async function ensureAdminSession(): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      return true;
    }

    // Attempt sign in with configured admin credentials
    console.log('[Auth] Re-authenticating admin session in Supabase...');
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: VALID_ADMIN_EMAIL,
      password: VALID_ADMIN_PASSWORD,
    });

    if (!signInErr && signInData?.session) {
      return true;
    }

    // Try auto-signup if user wasn't registered in Supabase auth yet
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: VALID_ADMIN_EMAIL,
      password: VALID_ADMIN_PASSWORD,
    });

    if (!signUpErr && signUpData?.session) {
      return true;
    }

    // Immediate retry sign-in after signup
    const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
      email: VALID_ADMIN_EMAIL,
      password: VALID_ADMIN_PASSWORD,
    });

    if (!retryErr && retryData?.session) {
      return true;
    }
  } catch (err) {
    console.warn('[Auth] ensureAdminSession warning:', err);
  }
  return false;
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

