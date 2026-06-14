import React from 'react';
import { getTMDBImageUrl } from '../utils/image';

const FeaturedSection = ({ movie, onWatch, onWishlist }) => {
 if (!movie) return null;

 const backdropUrl = getTMDBImageUrl(movie.backdrop_path || movie.poster_path, 'original');
 const releaseYear = (movie.release_date || movie.first_air_date || '').split('-')[0] || '2024';
 
 return (
 <section className="featured-section min-h-[600px] mb-20">
  <div className="featured-backdrop">
  <img 
   src={backdropUrl} 
   alt={movie.title || movie.name} 
   className="animate-bg-reveal brightness-[0.95] contrast-[1.05]" 
  />
  {/* Deep cinematic gradient from left */}
  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent z-0 opacity-80" />
  {/* Bottom vignette for smooth transition to grid */}
  <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black to-transparent z-0" />
  </div>
  
  <div className="featured-content animate-fade-in-up !py-12">
  <div className="flex items-center gap-6 mb-6">
   <span className="bg-red-600/30 backdrop-blur-sm text-white px-3 py-1 text-[11px] font-black">16+</span>
   <span className="text-white font-black text-[11px] tracking-widest">{releaseYear}</span>
   <span className="text-white/60 font-black text-[11px] tracking-widest">2 SEASONS</span>
   <div className="flex items-center gap-1 text-yellow-400">
   {[...Array(5)].map((_, i) => (
    <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < 4 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
   ))}
   </div>
  </div>

  <h2 className="text-6xl md:text-8xl font-black text-white mb-6 leading-[0.85] tracking-tighter">
   {movie.title || movie.name}
  </h2>
  
  <p className="text-base md:text-lg font-medium text-white/70 leading-relaxed mb-10 max-w-xl line-clamp-3">
   {movie.overview || "After a shipwreck, an intelligent robot called Roz is stranded on an uninhabited island. To survive the harsh environment, Roz bonds with the island's animals and cares for an orphaned baby goose."}
  </p>

  <div className="flex items-center gap-10 mb-10 text-[10px] font-black uppercase tracking-[0.4em]">
   <span className="text-white border-b-2 border-red-600 pb-2 cursor-pointer transition-all">Informations</span>
   <span className="text-white/30 hover:text-white transition-all cursor-pointer">Trailer</span>
   <span className="text-white/30 hover:text-white transition-all cursor-pointer">Reviews</span>
  </div>

  <div className="flex items-center gap-6">
   <button className="px-12 py-4 bg-red-600 text-white font-black hover:bg-red-700 hover:scale-105 transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-3" onClick={() => onWatch(movie.id)}>
   <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
   Watch
   </button>
   <button className="px-10 py-4 bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all uppercase tracking-[0.2em] text-[10px] flex items-center gap-3" onClick={() => onWishlist(movie)}>
   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg>
   My List
   </button>
  </div>
  </div>
 </section>
 );
};

export default FeaturedSection;