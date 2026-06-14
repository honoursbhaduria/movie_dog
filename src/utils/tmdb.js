/**
 * TMDB API Configuration & Helpers
 */
import { fetchWithCache } from './cache';

const RAW_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

// Use fallback key ONLY if the provided key is missing or is the placeholder
const FALLBACK_KEY = '7f6c06992de67834019b920fc5f704a1';
const isValidKey = (key) => key && key !== 'your_tmdb_api_key_here' && key.length > 10;

export const TMDB_API_KEY = isValidKey(RAW_API_KEY) ? RAW_API_KEY : FALLBACK_KEY;

// Robust proxy detection for local development
const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
export const TMDB_BASE_URL = isLocal ? '/tmdb-proxy' : 'https://api.tmdb.org/3';

const isBearer = TMDB_API_KEY && TMDB_API_KEY.length > 50;

/**
 * Get standard API options for TMDB fetch calls
 */
export const getTMDBOptions = () => {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
    }
  };
  
  if (isBearer) {
    options.headers.Authorization = `Bearer ${TMDB_API_KEY}`;
  }
  
  return options;
};

/**
 * Standardized TMDB fetch with cache and auto-auth
 */
export const tmdbFetch = async (endpoint, params = {}) => {
  const urlParams = new URLSearchParams(params);
  
  // If not using Bearer token, we MUST include api_key in query params
  if (!isBearer) {
    urlParams.set('api_key', TMDB_API_KEY);
  }

  const queryString = urlParams.toString();
  // Ensure endpoint starts with / and no double slashes when combining
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${TMDB_BASE_URL}${cleanEndpoint}${cleanEndpoint.includes('?') ? '&' : '?'}${queryString}`;
  
  // Clean up any double symbols
  const finalUrl = url.replace(/\?\?/g, '?').replace(/&&/g, '&');

  try {
    return await fetchWithCache(finalUrl, getTMDBOptions());
  } catch (err) {
    console.error(`TMDB Fetch Failed [${endpoint}]:`, err);
    throw err;
  }
};
