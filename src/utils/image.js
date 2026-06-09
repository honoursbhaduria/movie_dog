/**
 * Utility to handle TMDB image URLs with proxy support
 * @param {string} path - The relative path from TMDB (e.g., /p9o4Yp2DqE99Y0Tnp9rP18vI6L3.jpg)
 * @param {string} size - The size prefix (e.g., w500, original)
 * @returns {string} - The full URL, proxied if on localhost
 */
export const getTMDBImageUrl = (path, size = 'w500') => {
  if (!path) return '/no-movie.png';
  
  // If the path is already a full URL, return it
  if (path.startsWith('http')) return path;

  const base = window.location.hostname === 'localhost' 
    ? '/tmdb-image-proxy' 
    : 'https://image.tmdb.org';
    
  return `${base}/t/p/${size}${path}`;
};
