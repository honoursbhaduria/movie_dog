// Auth utility — Supabase Auth (supports email/password + Google OAuth)

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isConfigured = supabaseUrl && supabaseKey && supabaseKey !== 'your_anon_key_here';
let supabase = null;
if (isConfigured) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

/** Return the shared Supabase client (used by AuthCallback). */
export const getSupabase = () => supabase;

// In-memory session cache (updated via onAuthStateChange)
let _session = null;

/**
 * Initialise the auth state listener. Call this once at app startup.
 * @param {(session: object|null) => void} onChange — called whenever session changes
 * @returns {() => void} unsubscribe function
 */
export const initAuthListener = (onChange) => {
  if (!supabase) return () => { };

  // Seed the current session immediately
  supabase.auth.getSession().then(({ data: { session } }) => {
    _session = session;
    onChange(session);
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      _session = session;
      onChange(session);
    }
  );

  return () => subscription.unsubscribe();
};

/**
 * Register a new user via Supabase Auth (email + password).
 * @returns {Promise<{ ok: boolean, message: string, user?: object }>}
 */
export const register = async (name, email, password) => {
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password,
      options: {
        data: { name }, // stored in user_metadata
      },
    });

    if (error) throw error;

    return {
      ok: true,
      message: 'Account created successfully! Check your email to confirm.',
      user: {
        id: data.user?.id,
        name,
        email: data.user?.email,
      },
    };
  } catch (err) {
    console.error('Register error:', err);
    return { ok: false, message: err.message || 'Registration failed.' };
  }
};

/**
 * Log in with email + password via Supabase Auth.
 * @returns {Promise<{ ok: boolean, message: string, user?: object }>}
 */
export const login = async (email, password) => {
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error) throw error;

    const user = data.user;
    return {
      ok: true,
      message: 'Logged in!',
      user: {
        id: user.id,
        name: user.user_metadata?.name || user.email,
        email: user.email,
      },
    };
  } catch (err) {
    console.error('Login error:', err);
    return { ok: false, message: err.message || 'Login failed.' };
  }
};

/**
 * Start Google OAuth flow — redirects the browser to Google.
 */
export const loginWithGoogle = async () => {
  if (!supabase) {
    console.error('Supabase is not configured.');
    return;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Google login error:', error);
  }
};

/** Log out the current user (async). */
export const logout = async () => {
  if (supabase) {
    await supabase.auth.signOut();
  }
  _session = null;
};

/** Check whether a user session exists. */
export const isAuthenticated = () => {
  return !!_session;
};

/** Return the current session user or null. */
export const getUser = () => {
  if (!_session?.user) return null;
  const u = _session.user;
  return {
    id: u.id,
    name: u.user_metadata?.full_name || u.user_metadata?.name || u.email,
    email: u.email,
    avatar: u.user_metadata?.avatar_url || null,
  };
};
