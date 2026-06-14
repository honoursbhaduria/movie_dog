import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getTMDBImageUrl } from '../utils/image';
import { tmdbFetch } from '../utils/tmdb';

const Hero = ({ stackMovies = [], onWatchNow, onTrailer, onActiveMovieChange, resultsRef }) => {
 const [activeIndex, setActiveIndex] = useState(0);
 const [isAnimating, setIsAnimating] = useState(false);
 
 const [currentMovie, setCurrentMovie] = useState(stackMovies[0] || null);
 const [prevMovie, setPrevMovie] = useState(null);
 const [isTransitioning, setIsTransitioning] = useState(false);

 // Synchronize state with prop changes
 useEffect(() => {
 if (stackMovies.length > 0 && !currentMovie) {
  setCurrentMovie(stackMovies[0]);
 }
 }, [stackMovies, currentMovie]);

 // Handle background transition
 useEffect(() => {
 if (stackMovies.length > 0) {
  const movieAtCurrentIndex = stackMovies[activeIndex];
  if (movieAtCurrentIndex && (!currentMovie || movieAtCurrentIndex.id !== currentMovie.id)) {
  setPrevMovie(currentMovie);
  setCurrentMovie(movieAtCurrentIndex);
  setIsTransitioning(true);
  onActiveMovieChange(movieAtCurrentIndex);
  
  const timer = setTimeout(() => {
   setIsTransitioning(false);
  }, 1200); // Match index.css duration
  return () => clearTimeout(timer);
  }
 }
 }, [activeIndex, stackMovies, onActiveMovieChange, currentMovie]);

 // Infinite Auto-rotation
 useEffect(() => {
 if (stackMovies.length === 0) return;
 
 const interval = setInterval(() => {
  // Left-to-right flow: Decrement index so items appear to slide right
  setActiveIndex((prev) => (prev - 1 + stackMovies.length) % stackMovies.length);
 }, 8000); // Slower rotation for better visibility

 return () => clearInterval(interval);
 }, [stackMovies.length]);

 const handleCardClick = (index) => {
 setActiveIndex(index);
 };

 if (stackMovies.length === 0) return null;

 const movie = currentMovie || stackMovies[activeIndex];
 const releaseYear = (movie.release_date || movie.first_air_date || '').split('-')[0] || '2023';

 // Mapping some common genre IDs
 const genreMap = { 28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western' };
 const movieGenre = movie.genre_ids ? genreMap[movie.genre_ids[0]] || 'Drama' : 'Drama';

 // Helper to get cards for infinite display (showing 5 cards at once)
 const getVisibleCards = () => {
 const visibleCount = 5;
 const cards = [];
 for (let i = -2; i <= 2; i++) {
  const index = (activeIndex + i + stackMovies.length) % stackMovies.length;
  cards.push({ ...stackMovies[index], offset: i, originalIndex: index });
 }
 return cards;
 };

 return (
 <section className="hero-immersive">
  {/* Background Image Layer (Sliding) - Expanded to fill sidebar gap */}
  <div className="absolute -left-24 inset-y-0 right-0 z-0 pointer-events-none overflow-hidden">
  {isTransitioning && prevMovie && (
   <img 
   key={`prev-${prevMovie.id}`}
   src={getTMDBImageUrl(prevMovie.backdrop_path || prevMovie.poster_path, 'original')} 
   alt="" 
   className="absolute inset-0 w-full h-full object-cover animate-slide-right-out z-10"
   />
  )}
  <img 
   key={`curr-${movie.id}`}
   src={getTMDBImageUrl(movie.backdrop_path || movie.poster_path, 'original')} 
   alt="" 
   className={`absolute inset-0 w-full h-full object-cover z-20 ${isTransitioning ? 'animate-slide-right-in' : 'animate-bg-reveal'}`}
  />
  </div>

  <div className="hero-immersive-content">
  {/* Left Side: Metadata & Content */}
  <div className={`hero-info-panel`} key={movie.id}>
   <div className="flex flex-col gap-2 mb-4">
    <span className="text-white/30 text-[9px] font-black uppercase tracking-[0.5em] animate-fade-in-up">Disney</span>
    <h1 className="hero-title-large animate-fade-in-up">{movie.title || movie.name}</h1>
   </div>
   
   <div className="hero-metadata-row animate-fade-in-up mb-8" style={{ animationDelay: '0.1s' }}>
   <span className="meta-year">{releaseYear}</span>
   <span className="meta-badge-vibrant">12+</span>
   <span className="meta-duration">2h 14min</span>
   <span className="meta-genre">{movieGenre}</span>
   </div>

   <p className="hero-description-large animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
   {movie.overview}
   </p>

   <div className="hero-actions-row animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
   <button className="btn-watch-vibrant" onClick={() => onWatchNow(movie.id)}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
    WATCH
   </button>
   <button className="btn-mylist-minimal" onClick={() => onTrailer(movie.id)}>
    + MY LIST
   </button>
   </div>
  </div>

  {/* Right Side: Animated Infinite Card Stack */}
  <div className="hero-stack-panel">
   <div className="card-stack-container">
   {getVisibleCards().map((m) => (
    <div 
    key={m.id}
    className={`stack-card-item ${m.offset === 0 ? 'card-active' : ''}`}
    onClick={() => handleCardClick(m.originalIndex)}
    style={{
     '--offset': m.offset,
     '--abs-offset': Math.abs(m.offset)
    }}
    >
    <img src={getTMDBImageUrl(m.poster_path, 'w500')} alt={m.title} />
    {m.offset === 0 && <div className="card-reflection" />}
    </div>
   ))}
   </div>
  </div>
  </div>

  {/* Background Vignette */}
  <div className="hero-vignette" />
 </section>
 );
};

export default Hero;