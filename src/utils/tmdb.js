/**
 * TMDB API Configuration & Helpers
 */

export const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
export const TMDB_BASE_URL = window.location.hostname === 'localhost' ? '/tmdb-proxy' : 'https://api.tmdb.org/3';

const isBearer = TMDB_API_KEY && TMDB_API_KEY.length > 50;

/**
 * Get standard API options for TMDB fetch calls
 */
export const getTMDBOptions = () => ({
  method: 'GET',
  headers: {
    accept: 'application/json',
    ...(isBearer ? { Authorization: `Bearer ${TMDB_API_KEY}` } : {})
  }
});

/**
 * Append api_key to URL if we're not using a Bearer token
 * @param {string} url 
 * @returns {string}
 */
export const appendApiKey = (url) => {
  if (!TMDB_API_KEY) return url;
  if (isBearer) return url;
  
  const urlObj = new URL(url.startsWith('http') ? url : `${window.location.origin}${url}`);
  urlObj.searchParams.set('api_key', TMDB_API_KEY);
  return urlObj.toString();
};

/**
 * Standardized TMDB fetch with cache and auto-auth
 */
import { fetchWithCache } from './cache';

export const tmdbFetch = async (endpoint, params = {}) => {
  const urlParams = new URLSearchParams(params);
  let url = `${TMDB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}${urlParams.toString()}`;
  
  // Clean up double question marks if they exist
  url = url.replace('??', '?').replace('&&', '&');

  if (!isBearer && TMDB_API_KEY) {
    const urlObj = new URL(url.startsWith('http') ? url : `http://localhost${url}`);
    urlObj.searchParams.set('api_key', TMDB_API_KEY);
    url = urlObj.pathname + urlObj.search;
    if (TMDB_BASE_URL.startsWith('http')) {
        url = TMDB_BASE_URL + url;
    }
  }

  return fetchWithCache(url, getTMDBOptions());
};
