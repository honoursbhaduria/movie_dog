import { useState, useEffect } from 'react';
import { getWishlist, removeFromWishlist } from '../utils/wishlist';
import MovieCard from './MovieCard';

const Wishlist = ({ onMovieClick, onClose }) => {
  const [wishlist, setWishlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    setIsLoading(true);
    try {
      const items = await getWishlist();
      setWishlist(items);
    } catch (err) {
      console.error('Error loading wishlist:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (movieId, e) => {
    e.stopPropagation();
    await removeFromWishlist(movieId);
    await loadWishlist();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content wishlist-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="modal-body">
          <h2 className="wishlist-title">My Favorites</h2>
          <p className="text-gray-200 mb-6">
            {wishlist.length} {wishlist.length === 1 ? 'movie' : 'movies'} saved
          </p>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin h-10 w-10 border-4 border-light-100 border-t-transparent rounded-full"></div>
            </div>
          ) : wishlist.length === 0 ? (
            <div className="empty-wishlist">
              <p>Your favorites list is empty</p>
              <p className="text-sm text-gray-200 mt-2">
                Click "Add to Favorites" on any movie to save it here
              </p>
            </div>
          ) : (
            <ul className="wishlist-grid">
              {wishlist.map((movie) => (
                <li key={movie.id} className="wishlist-item">
                  <MovieCard
                    movie={movie}
                    onClick={() => onMovieClick(movie.id, movie.media_type)}
                  />
                  <button
                    className="remove-wishlist-btn"
                    onClick={(e) => handleRemove(movie.id, e)}
                    title="Remove from favorites"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
