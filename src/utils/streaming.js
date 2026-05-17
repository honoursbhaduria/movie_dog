/**
 * Streaming Utility for Movie Dog
 * Handles watch progress tracking using localStorage
 */

const PROGRESS_KEY = 'movie_watch_progress';

/**
 * Save watch progress for a movie
 * @param {string|number} movieId - TMDB Movie ID
 * @param {object} data - Progress data from Vidking player
 */
export const saveWatchProgress = (movieId, data) => {
  const allProgress = getProgressMap();
  allProgress[movieId] = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(allProgress));
};

/**
 * Get watch progress for a movie
 * @param {string|number} movieId - TMDB Movie ID
 * @returns {object|null} - Progress data or null
 */
export const getWatchProgress = (movieId) => {
  const allProgress = getProgressMap();
  return allProgress[movieId] || null;
};

/**
 * Get the full map of movie progress
 * @returns {object}
 */
const getProgressMap = () => {
  const stored = localStorage.getItem(PROGRESS_KEY);
  return stored ? JSON.parse(stored) : {};
};

/**
 * Get the timestamp (seconds) to resume from
 * @param {string|number} movieId 
 * @returns {number}
 */
export const getResumeTime = (movieId) => {
  const progress = getWatchProgress(movieId);
  // Only resume if progress is between 1% and 95%
  if (progress && progress.progress > 1 && progress.progress < 95) {
    return Math.floor(progress.timestamp || 0);
  }
  return 0;
};
