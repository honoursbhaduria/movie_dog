import React, { useRef, useEffect } from 'react';
import { getTMDBImageUrl } from '../utils/image';

const HorizontalScroll = ({ title, movies, onMovieClick }) => {
 const scrollRef = useRef(null);

 useEffect(() => {
 const handleScroll = () => {
  if (!scrollRef.current) return;
  const scrollY = window.scrollY;
  // Adjust the multiplier (0.5) to control scroll speed sensitivity
  scrollRef.current.scrollLeft = scrollY * 0.8;
 };

 window.addEventListener('scroll', handleScroll);
 return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 if (!movies || movies.length === 0) return null;

 return (
 <section className="horizontal-scroll py-10">
  <div className="px-12 md:px-32 mb-6 text-[10px] font-black uppercase tracking-[0.5em] text-white/30">
  {title}
  </div>
  <div 
  ref={scrollRef}
  className="scroll-container !px-12 md:!px-32 transition-all duration-300 ease-out"
  >
  {movies.map((movie) => (
   <div 
   key={movie.id} 
   className="scroll-item group !overflow-hidden"
   onClick={() => onMovieClick(movie.id)}
   >
   <img 
    src={getTMDBImageUrl(movie.poster_path, 'w500')} 
    alt={movie.title || movie.name} 
    loading="lazy"
    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
   />
   
   {/* Play Button Overlay */}
   <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
    <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500">
     <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
    </div>
   </div>

   {/* Content Overlay */}
   <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
    <h4 className="text-white font-black text-xs truncate tracking-tight mb-1">{movie.title || movie.name}</h4>
    <div className="flex items-center justify-between">
    <span className="text-white/40 text-[8px] font-black">{ (movie.release_date || movie.first_air_date || '').split('-')[0] || '2024' }</span>
    <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 backdrop-blur-sm">
     <svg width="8" height="8" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
     <span className="text-white text-[8px] font-black">{movie.vote_average ? movie.vote_average.toFixed(1) : '7.5'}</span>
    </div>
    </div>
   </div>
   </div>
  ))}
  </div>
 </section>
 );
};

export default HorizontalScroll;