import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'your_anon_key_here';

let supabase = null;

if (isSupabaseConfigured) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

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

export const getTrendingMovies = async () => {
  if (!isSupabaseConfigured || !supabase) return [];

  try {
    const { data, error } = await supabase
      .from('trending_searches')
      .select('*')
      .order('count', { ascending: false })
      .limit(5);

    if (error) throw error;

    return data.map(item => ({
      $id: item.movie_id,
      title: item.title,
      poster_url: item.poster_url,
      count: item.count
    }));
  } catch (error) {
    console.error('Error fetching trending movies:', error);
    return [];
  }
};
