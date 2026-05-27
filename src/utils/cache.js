const cache = new Map();

/**
 * Fetch with in-memory caching.
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

  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.statusText}`);
  }

  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
};

export const clearCache = () => cache.clear();
