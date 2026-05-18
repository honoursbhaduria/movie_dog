// Wishlist/Favorites utility — Supabase for logged-in users, localStorage fallback

import { supabase } from '../supabase';
import { getUser, isAuthenticated } from './auth';

// ═══════════════════════════════════════════
// Core CRUD — async, works with both backends
// ═══════════════════════════════════════════

export const getWishlist = async () => {
  const user = getUser();

  if (supabase && user?.id) {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Map Supabase rows → shape expected by MovieCard
      return (data || []).map(row => ({
        id: row.movie_id,
        title: row.title,
        poster_path: row.poster_path,
        vote_average: row.vote_average,
        release_date: row.release_date,
        original_language: row.original_language,
        media_type: row.media_type || 'movie',
        addedAt: row.added_at,
        _supabaseId: row.id,
      }));
    } catch (err) {
      console.error('Error fetching favorites from Supabase:', err);
    }
  }

  // Fallback: localStorage
  const wishlist = localStorage.getItem('movieWishlist');
  return wishlist ? JSON.parse(wishlist) : [];
};

export const addToWishlist = async (movie) => {
  const user = getUser();

  // Detect media type: TV shows have 'name' instead of 'title' in many TMDB responses,
  // or they explicitly have media_type === 'tv'
  const media_type = (movie.media_type === 'tv' || !movie.title) ? 'tv' : 'movie';

  if (supabase && user?.id) {
    try {
      const { error } = await supabase
        .from('favorites')
        .upsert({
          user_id: user.id,
          movie_id: movie.id,
          title: movie.title || movie.name,
          poster_path: movie.poster_path,
          vote_average: movie.vote_average,
          release_date: movie.release_date || movie.first_air_date,
          original_language: movie.original_language,
          media_type: media_type,
        }, { onConflict: 'user_id,movie_id' });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error adding favorite to Supabase:', err);
      // We still try to return true if it was at least saved locally or if we want to proceed
      return false;
    }
  }

  // Fallback: localStorage
  const wishlist = await getWishlist();
  const exists = wishlist.find(item => item.id === movie.id);
  if (!exists) {
    wishlist.push({ 
      ...movie, 
      media_type: media_type, 
      addedAt: new Date().toISOString() 
    });
    localStorage.setItem('movieWishlist', JSON.stringify(wishlist));
    return true;
  }
  return false;
};

export const removeFromWishlist = async (movieId) => {
  const user = getUser();

  if (supabase && user?.id) {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('movie_id', movieId);

      if (error) throw error;
      return;
    } catch (err) {
      console.error('Error removing favorite from Supabase:', err);
    }
  }

  // Fallback: localStorage
  const wishlist = await getWishlist();
  const filtered = wishlist.filter(item => item.id !== movieId);
  localStorage.setItem('movieWishlist', JSON.stringify(filtered));
};

export const isInWishlist = async (movieId) => {
  const user = getUser();

  if (supabase && user?.id) {
    try {
      const { count, error } = await supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('movie_id', movieId);

      if (error) throw error;
      return (count || 0) > 0;
    } catch (err) {
      console.error('Error checking favorite:', err);
    }
  }

  // Fallback: localStorage
  const wishlist = await getWishlist();
  return wishlist.some(item => item.id === movieId);
};

// ═══════════════════════════════════════════
// Platform preferences (localStorage only)
// ═══════════════════════════════════════════

export const getPlatformPreferences = () => {
  const prefs = localStorage.getItem('platformPreferences');
  return prefs ? JSON.parse(prefs) : [];
};

export const setPlatformPreferences = (platforms) => {
  localStorage.setItem('platformPreferences', JSON.stringify(platforms));
};

export const togglePlatformPreference = (providerId, providerName) => {
  const prefs = getPlatformPreferences();
  const exists = prefs.find(p => p.id === providerId);

  if (exists) {
    const filtered = prefs.filter(p => p.id !== providerId);
    setPlatformPreferences(filtered);
  } else {
    prefs.push({ id: providerId, name: providerName });
    setPlatformPreferences(prefs);
  }
};

export const hasPlatformPreference = (providerId) => {
  const prefs = getPlatformPreferences();
  return prefs.some(p => p.id === providerId);
};

// ═══════════════════════════════════════════
// Legacy sync helpers (kept for compatibility)
// ═══════════════════════════════════════════

export const updateMoviePrices = (movieId, providers) => {
  const raw = localStorage.getItem('movieWishlist');
  const wishlist = raw ? JSON.parse(raw) : [];
  const movie = wishlist.find(item => item.id === movieId);

  if (movie) {
    if (!movie.priceHistory) movie.priceHistory = [];
    movie.priceHistory.push({ date: new Date().toISOString(), providers });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    movie.priceHistory = movie.priceHistory.filter(
      entry => new Date(entry.date) > thirtyDaysAgo
    );

    localStorage.setItem('movieWishlist', JSON.stringify(wishlist));
  }
};
