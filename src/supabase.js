import { createClient } from '@supabase/supabase-js';

// Supabase is currently disabled to prevent CORS/Network errors in restricted environments.
// The app will automatically fallback to TMDB-native data.
export const supabase = null;
const isSupabaseConfigured = false;
let isSupabaseBlocked = true;

export default supabase;

export const updateSearchCount = async (searchTerm, movie) => {
  // Disabled
  return;
};

export const getTrendingMovies = async () => {
  // Always return empty to trigger TMDB fallback in App.jsx
  return [];
};
