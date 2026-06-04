import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

// Check if Supabase is configured and valid
const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseKey && 
  supabaseKey !== 'your_key_here';

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export default supabase;

export const updateSearchCount = async (searchTerm, movie) => {
  if (!isSupabaseConfigured || !supabase) return;

  try {
    // Check if search term exists
    const { data: existing, error: fetchError } = await supabase
      .from('trending_searches')
      .select('*')
      .eq('search_term', searchTerm)
      .single();

    if (existing) {
      // Update existing count
      await supabase
        .from('trending_searches')
        .update({ 
          count: existing.count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Insert new search term
      await supabase
        .from('trending_searches')
        .insert({
          search_term: searchTerm,
          count: 1,
          movie_id: movie.id,
          poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
          title: movie.title
        });
    }
  } catch (error) {
    console.error('Error updating search count:', error);
  }
};

let trendingCache = { data: null, timestamp: 0 };
const TRENDING_CACHE_TTL = 60000; // 1 minute

export const getTrendingMovies = async () => {
  if (!isSupabaseConfigured || !supabase) return [];

  // Simple in-memory cache for trending movies
  if (trendingCache.data && (Date.now() - trendingCache.timestamp < TRENDING_CACHE_TTL)) {
    return trendingCache.data;
  }

  try {
    const { data, error } = await supabase
      .from('trending_searches')
      .select('*')
      .order('count', { ascending: false })
      .limit(5);

    if (error) return [];

    const results = data.map(item => ({
      $id: item.movie_id,
      title: item.title,
      poster_url: item.poster_url,
      count: item.count
    }));

    trendingCache = { data: results, timestamp: Date.now() };
    return results;
  } catch (error) {
    // Completely silent to avoid console clutter if blocked by browser/adblock
    return [];
  }
};
