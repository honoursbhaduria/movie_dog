import { useState, useEffect } from 'react';
import { getWishlist, removeFromWishlist } from '../utils/wishlist';
import { getTMDBImageUrl } from '../utils/image';

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
 <>
  {/* Subtle backdrop */}
  <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-[4px]" onClick={onClose} />

  {/* Professional Side Drawer (Left) */}
  <div className="fixed top-0 left-0 h-full w-full sm:w-[450px] bg-[#0A0A0A] border-r border-white/5 z-[1001] animate-slide-left-in flex flex-col">
  
  {/* Clean Header */}
  <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
   <div className="flex items-center gap-3">
   <div className="w-10 h-10 bg-accent flex items-center justify-center ">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
     <path d="M12 2l2.09 6.91L21 12l-6.91 2.09L12 21l-2.09-6.91L3 12l6.91-2.09L12 2z" />
    </svg>
   </div>
   <div>
    <h2 className="text-white font-bold text-lg leading-tight">My Favorites</h2>
    <p className="text-gray-400 text-xs">{wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved</p>
   </div>
   </div>
   <button 
   onClick={onClose}
   className="w-8 h-8 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
   >
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
   </svg>
   </button>
  </div>

  {/* Content Area */}
  <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
   {isLoading ? (
   <div className="flex flex-col h-full items-center justify-center gap-4">
    <div className="w-10 h-10 border-2 border-white/5 border-t-accent animate-spin" />
    <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Loading Collection</p>
   </div>
   ) : wishlist.length === 0 ? (
   <div className="flex flex-col h-full items-center justify-center text-center space-y-4">
    <div className="w-16 h-16 bg-white/5 flex items-center justify-center">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-500">
     <path d="M12 2l2.09 6.91L21 12l-6.91 2.09L12 21l-2.09-6.91L3 12l6.91-2.09L12 2z" />
    </svg>
    </div>
    <h3 className="text-xl font-bold text-white">Your list is empty</h3>
    <p className="text-sm text-gray-500 max-w-[250px]">
    Explore the catalog and save movies you're interested in for quick access.
    </p>
   </div>
   ) : (
   <div className="space-y-4">
    {wishlist.map((movie) => (
    <div 
     key={movie.id} 
     className="group relative flex items-center gap-4 bg-white/5 p-3 hover:bg-white/10 transition-all duration-300 cursor-pointer"
     onClick={() => onMovieClick(movie.id, movie.media_type)}
    >
     <div className="w-16 h-24 overflow-hidden bg-black/50 shrink-0">
     {movie.poster_path ? (
      <img
      src={getTMDBImageUrl(movie.poster_path, 'w185')}
      alt={movie.title}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
     ) : (
      <div className="w-full h-full flex items-center justify-center text-xl">🎬</div>
     )}
     </div>
     <div className="flex-1 min-w-0">
     <h4 className="text-white font-bold text-sm truncate group-hover:text-accent transition-colors">{movie.title || movie.name}</h4>
     <div className="flex items-center gap-3 mt-1.5">
      <span className="text-[10px] text-gray-400 font-bold px-2 py-0.5 ">
      {(movie.release_date || movie.first_air_date || '????').split('-')[0]}
      </span>
      <span className="flex items-center gap-1 text-[10px] text-yellow-500 font-black">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
       <path d="M12 2L15.09 8.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {movie.vote_average?.toFixed(1) || '0.0'}
      </span>
     </div>
     </div>

     {/* Remove Button - Clean Interaction */}
     <button 
     onClick={(e) => handleRemove(movie.id, e)}
     className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all duration-300"
     title="Remove from favorites"
     >
     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
     </svg>
     </button>
    </div>
    ))}
   </div>
   )}
  </div>

  {/* Footer Info */}
  <div className="px-8 py-6 border-t border-white/5 bg-white/2">
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 text-center">Locally Stored in Browser</p>
  </div>
  </div>
 </>
 );
};

export default Wishlist;
