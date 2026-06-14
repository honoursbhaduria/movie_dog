import React, { useState, useEffect, useRef } from 'react';
import { getTMDBImageUrl } from '../utils/image';

const Footer = ({ movies = [] }) => {
 const [currentIndex, setCurrentIndex] = useState(0);
 const [nextIndex, setNextIndex] = useState(1);
 const [isWiping, setIsWiping] = useState(false);
 const [displayMovie, setDisplayMovie] = useState(null);
 
 const movieCount = movies.length;

 useEffect(() => {
 if (movieCount > 0 && !displayMovie) {
  setDisplayMovie(movies[0]);
 }
 }, [movies, movieCount, displayMovie]);

 useEffect(() => {
 if (movieCount <= 1) return;

 const interval = setInterval(() => {
  setIsWiping(true);
  
  // Halfway through the wipe animation, we switch the image
  setTimeout(() => {
  const nextIdx = (currentIndex + 1) % movieCount;
  setCurrentIndex(nextIdx);
  setDisplayMovie(movies[nextIdx]);
  }, 1250); // Match half of the 2.5s CSS animation

  // Reset wipe state
  setTimeout(() => {
  setIsWiping(false);
  }, 2500);
 }, 8000);

 return () => clearInterval(interval);
 }, [currentIndex, movieCount, movies]);

 if (!displayMovie) return null;

 return (
 <footer className="footer-cinematic-slider">
  {/* Background Image Layer */}
  <div className="slider-image-container">
  <img 
   key={displayMovie.id}
   src={getTMDBImageUrl(displayMovie.backdrop_path || displayMovie.poster_path, 'original')} 
   alt="" 
   className="slider-image image-fade-in brightness-[0.4] grayscale-[0.3]"
  />
  </div>

  {/* Shadow Wipe Layer */}
  <div className={` ${isWiping ? 'animate' : ''}`} />

  {/* Deep Vignette */}
  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10" />
  <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10" />

  {/* Foreground Content */}
  <div className="footer-overlay-content">
  <div className="flex flex-col md:flex-row justify-between items-end md:items-center pt-8 border-t border-white/5 gap-8">
   <div className="flex flex-col gap-2">
   <h3 className="text-xl font-bold tracking-widest text-white">MOVIE DOG</h3>
   <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">The Ultimate Viewing Experience</p>
   </div>

   <nav className="flex gap-12 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
   <a href="#" className="hover:text-white transition-colors">Movies</a>
   <a href="#" className="hover:text-white transition-colors">Series</a>
   <a href="#" className="hover:text-white transition-colors">Vibe</a>
   </nav>

   <div className="flex flex-col items-end gap-1">
   <p className="text-[10px] font-black text-white/20 tracking-widest uppercase">© 2026 MOVIE DOG</p>
   <div className="flex gap-4 text-[8px] font-bold text-white/5 uppercase tracking-widest">
    <a href="#">Privacy Policy</a>
    <a href="#">Terms of Use</a>
   </div>
   </div>
  </div>
  </div>
 </footer>
 );
};

export default Footer;
