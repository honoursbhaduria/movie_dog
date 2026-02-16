// Auth utility — Supabase-backed with localStorage session cache

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SESSION_KEY = 'currentSession';

const isConfigured = supabaseUrl && supabaseKey && supabaseKey !== 'your_anon_key_here';
let supabase = null;
if (isConfigured) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

/** Simple demo-grade hash (not production-safe — use bcrypt on a real backend) */
const hashPassword = (pw) => btoa(unescape(encodeURIComponent(pw)));

/**
 * Register a new user → Supabase `users` table.
 * @returns {Promise<{ ok: boolean, message: string, user?: object }>}
 */
export const register = async (name, email, password) => {
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured.' };
  }

  try {
    // Check for existing user
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return { ok: false, message: 'An account with this email already exists.' };
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: hashPassword(password),
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ok: true,
      message: 'Account created successfully!',
      user: { id: data.id, name: data.name, email: data.email },
    };
  } catch (err) {
    console.error('Register error:', err);
    return { ok: false, message: err.message || 'Registration failed.' };
  }
};

/**
 * Log in — validates against Supabase `users` table.
 * @returns {Promise<{ ok: boolean, message: string, user?: object }>}
 */
export const login = async (email, password) => {
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured.' };
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password_hash', hashPassword(password))
      .maybeSingle();

    if (error) throw error;

    if (!user) {
      return { ok: false, message: 'Invalid email or password.' };
    }

    const session = { id: user.id, name: user.name, email: user.email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { ok: true, message: 'Logged in!', user: session };
  } catch (err) {
    console.error('Login error:', err);
    return { ok: false, message: err.message || 'Login failed.' };
  }
};

/** Log out the current user. */
export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

/** Check whether a user session exists. */
export const isAuthenticated = () => {
  return !!localStorage.getItem(SESSION_KEY);
};

/** Return the current session user or null. */
export const getUser = () => {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
};
