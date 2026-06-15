import React, { memo, useState, useEffect } from 'react'
import { getTMDBImageUrl } from '../utils/image'
import { isInWishlist, addToWishlist, removeFromWishlist } from '../utils/wishlist'

const MovieCard = memo(({ movie, onClick }) => {
 const { 
 id,
 title, 
 name, 
 vote_average, 
 poster_path, 
 release_date, 
 first_air_date 
 } = movie;

 const [inWishlist, setInWishlist] = useState(false);

 useEffect(() => {
 isInWishlist(id).then(setInWishlist);
 }, [id]);

 const handleWishlistToggle = async (e) => {
 e.stopPropagation();
 if (inWishlist) {
  await removeFromWishlist(id);
  setInWishlist(false);
 } else {
  await addToWishlist(movie);
  setInWishlist(true);
 }
 };

 const displayTitle = title || name;
 const displayDate = (release_date || first_air_date || '').split('-')[0] || '2024';
 const rating = vote_average ? vote_average.toFixed(1) : '7.5';

 return (
 <div className="group relative cursor-pointer" onClick={onClick}>
  {/* Poster Container */}
  <div className="relative aspect-[2/3] overflow-hidden bg-[#1a1a1a] transition-all duration-500 group-hover:scale-[1.04]">
  <img
   src={getTMDBImageUrl(poster_path, 'w500')}
   alt={displayTitle}
   loading="lazy"
   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
  />

  {/* Favorite Toggle (Plus Icon) */}
  <button 
   onClick={handleWishlistToggle}
   className={`absolute top-6 right-6 z-40 w-12 h-12 backdrop-blur-3xl transition-all duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 ${inWishlist ? 'bg-white text-black' : 'bg-black/40 text-white hover:bg-white/20'}`}
  >
   <svg 
   width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
   className={`transition-transform duration-500 ${inWishlist ? 'rotate-[135deg] scale-110' : 'rotate-0'}`}
   >
    <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
   </svg>
  </button>

  {/* Play Icon on Hover */}
  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
   <div className="w-20 h-20 bg-white/10 backdrop-blur-md flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
   </div>
  </div>

  {/* Info Overlay */}
  <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black via-black/90 to-transparent">
   <div className="flex flex-col gap-1">
   <h3 className="text-white font-black text-xl leading-tight truncate tracking-tight">
    {displayTitle}
   </h3>
   
   <div className="flex items-center gap-4 mt-3">
    <span className="text-white/60 text-[11px] font-black uppercase tracking-widest">{displayDate}</span>
    <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1 backdrop-blur-md">
     <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
     <span className="text-white text-[11px] font-black">{rating}</span>
    </div>
   </div>
   </div>
  </div>
  </div>
 </div>
 )
});

MovieCard.displayName = 'MovieCard';

export default MovieCard