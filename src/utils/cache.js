const cache = new Map();

/**
 * Fetch with in-memory caching and TMDB-specific fallback.
 * @param {string} url 
 * @param {object} options 
 * @param {number} ttl - Time to live in milliseconds (default 5 minutes)
 */
export const fetchWithCache = async (url, options = {}, ttl = 300000) => {
  const cacheKey = JSON.stringify({ url, options });
  const cached = cache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < ttl)) {
    return cached.data;
  }

  // Fallback logic for TMDB: try different hostname if first one fails
  let finalUrl = url;
  let finalOptions = { ...options };

  try {
    let response;
    try {
      response = await fetch(finalUrl, finalOptions);
    } catch (netErr) {
      // Hostname fallback for TMDB
      if (url.includes('api.themoviedb.org')) {
        console.warn('api.themoviedb.org failed, trying api.tmdb.org fallback...');
        finalUrl = url.replace('api.themoviedb.org', 'api.tmdb.org');
        response = await fetch(finalUrl, finalOptions);
      } else {
        throw netErr;
      }
    }
    
    // If TMDB returns 401 and we're using a Bearer token, try falling back to api_key param
    if (response.status === 401 && (finalUrl.includes('themoviedb.org') || finalUrl.includes('tmdb.org')) && finalOptions.headers?.Authorization?.includes('Bearer')) {
      const token = finalOptions.headers.Authorization.split(' ')[1];
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const v3Key = payload.aud;
        if (v3Key) {
          const urlObj = new URL(finalUrl);
          urlObj.searchParams.set('api_key', v3Key);
          finalUrl = urlObj.toString();
          delete finalOptions.headers.Authorization;
          
          const retryResponse = await fetch(finalUrl, finalOptions);
          if (retryResponse.ok) return await retryResponse.json();
        }
      } catch (e) { /* ignore fallback errors */ }
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const data = await response.json();
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    // Return empty results for search endpoints to prevent UI crashes
    if (url.includes('/search/') || url.includes('/trending/') || url.includes('/discover/')) {
      return { results: [], page: 1, total_pages: 0, total_results: 0 };
    }
    throw error;
  }
};

export const clearCache = () => cache.clear();
