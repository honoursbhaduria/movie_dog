import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchWithCache } from '../utils/cache'
import { getTMDBImageUrl } from '../utils/image'
import {
 addToWishlist,
 removeFromWishlist,
 isInWishlist,
} from '../utils/wishlist'

import { 
 saveWatchProgress, 
 getResumeTime 
} from '../utils/streaming'

import Spinner from './Spinner'

import { tmdbFetch, TMDB_BASE_URL, TMDB_API_KEY } from '../utils/tmdb'
import WatchTogetherButton from './WatchTogetherButton'

const MovieDetails = () => {
 const { id: movieId, type: contentType } = useParams();
 const navigate = useNavigate();
 
 const [details, setDetails] = useState(null);
 const [credits, setCredits] = useState(null);
 const [videos, setVideos] = useState(null);
 const [watchProviders, setWatchProviders] = useState(null);
 const [similarMovies, setSimilarMovies] = useState([]);
 const [isLoading, setIsLoading] = useState(true);
 const [inWishlist, setInWishlist] = useState(false);

 // TV specific state
 const [selectedSeason, setSelectedSeason] = useState(1);
 const [episodes, setEpisodes] = useState([]);
 const [loadingEpisodes, setLoadingEpisodes] = useState(false);
 const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
 const seasonDropdownRef = useRef(null);

 useEffect(() => {
 if (movieId) {
  isInWishlist(movieId).then(val => setInWishlist(val));
 }

 const fetchDetails = async () => {
  try {
  setIsLoading(true);
  const type = contentType === 'tv' ? 'tv' : 'movie';

  const detailsData = await tmdbFetch(`/${type}/${movieId}`, { language: 'en-US' });
  setDetails(detailsData);
  
  if (contentType === 'tv' && detailsData.seasons?.length > 0) {
   const firstSeason = detailsData.seasons.find(s => s.season_number > 0) || detailsData.seasons[0];
   setSelectedSeason(firstSeason.season_number);
  }

  Promise.allSettled([
   tmdbFetch(`/${type}/${movieId}/credits`, { language: 'en-US' }),
   tmdbFetch(`/${type}/${movieId}/videos`, { language: 'en-US' }),
   tmdbFetch(`/${type}/${movieId}/watch/providers`),
   tmdbFetch(`/${type}/${movieId}/similar`, { language: 'en-US' })
  ]).then(([creditsRes, videosRes, providersRes, similarRes]) => {
   if (creditsRes.status === 'fulfilled') setCredits(creditsRes.value);
   if (videosRes.status === 'fulfilled') setVideos(videosRes.value);
   if (providersRes.status === 'fulfilled') setWatchProviders(providersRes.value);
   if (similarRes.status === 'fulfilled') setSimilarMovies(similarRes.value.results || []);
  });

  } catch (error) {
  console.error('Error fetching details:', error);
  } finally {
  setIsLoading(false);
  }
 };

 if (movieId) {
  fetchDetails();
 }
 }, [movieId, contentType]);

 useEffect(() => {
 const fetchEpisodes = async () => {
  if (contentType !== 'tv' || !movieId || selectedSeason === null) return;

  try {
  setLoadingEpisodes(true);
  const data = await tmdbFetch(`/tv/${movieId}/season/${selectedSeason}`, { language: 'en-US' });
  setEpisodes(data.episodes || []);
  } catch (error) {
  console.error('Error fetching episodes:', error);
  } finally {
  setLoadingEpisodes(false);
  }
 };

 fetchEpisodes();
 }, [movieId, contentType, selectedSeason]);

 // Handle outside clicks for dropdown
 useEffect(() => {
 const handleClickOutside = (event) => {
  if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(event.target)) {
  setIsSeasonDropdownOpen(false);
  }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#000000]"><Spinner /></div>;
 if (!details) return <div className="min-h-screen flex items-center justify-center bg-[#000000] text-white">Content not found.</div>;

 const toggleWishlist = async () => {
 if (inWishlist) {
  await removeFromWishlist(movieId);
  setInWishlist(false);
 } else {
  await addToWishlist(details);
  setInWishlist(true);
 }
 };

 const title = details.title || details.name;
 const backdropUrl = getTMDBImageUrl(details.backdrop_path || details.poster_path, 'original');

 const handleWatchNow = () => {
 if (contentType === 'tv') {
  navigate(`/player/tv/${movieId}/${selectedSeason}/1`);
 } else {
  navigate(`/player/movie/${movieId}`);
 }
 };

 return (
 <div className="details-page relative min-h-screen text-white overflow-x-hidden bg-[#000000]">
  {/* ── Top Navigation (Not Fixed) ── */}
  <div className="absolute top-12 left-20 z-[200] animate-fade-in">
  <button onClick={() => navigate(-1)} className="flex items-center gap-4 text-white/40 hover:text-white transition-all text-[11px] font-black uppercase tracking-[0.3em] bg-white/5 border border-white/10 px-10 py-5 group">
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="group-hover:-translate-x-1 transition-transform"><path d="M15 18l-6-6 6-6"/></svg>
   Go Back
  </button>
  </div>

  {/* Immersive Cinematic Backdrop */}
  <div className="fixed inset-0 z-0">
   <img 
   src={backdropUrl} 
   className="w-full h-full object-cover brightness-[0.7] contrast-[1.05] animate-bg-reveal" 
   alt="" 
   />
   <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent" />
   <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-[#000000] to-transparent" />
  </div>

  <div className="relative z-10 max-w-[1400px] mx-auto px-8 sm:px-20 py-24 lg:py-40">
  
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
   
   {/* Main Info Column */}
   <div className="lg:col-span-8 flex flex-col gap-16">
   <header className="space-y-10 animate-fade-in-up">
    <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-[0.5em] text-white/40">
    <span className="bg-red-600/80 backdrop-blur-md text-white px-3 py-1">16+</span>
    <span>{details.release_date?.split('-')[0] || details.first_air_date?.split('-')[0]}</span>
    <span className="w-2 h-2 bg-red-600 animate-pulse" />
    <span>{details.runtime || details.episode_run_time?.[0]} MINS</span>
    <span>{details.genres?.slice(0, 2).map(g => g.name).join(' & ')}</span>
    </div>

    <h1 className="text-7xl sm:text-[140px] font-black leading-[0.8] tracking-tighter">
    {title}
    </h1>

    {details.tagline && (
    <p className="text-2xl sm:text-4xl text-white/50 font-medium tracking-tight max-w-2xl italic leading-tight">
     &ldquo;{details.tagline}&rdquo;
    </p>
    )}

    <div className="flex flex-wrap items-center gap-8 pt-8">
    <button onClick={handleWatchNow} className="px-16 py-6 bg-red-600 text-white font-black hover:bg-red-700 hover:scale-105 transition-all uppercase tracking-widest text-[11px] flex items-center gap-4">
     <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
     Watch Now
    </button>
    <button onClick={toggleWishlist} className="px-12 py-6 bg-white/5 border border-white/10 text-white font-black hover:bg-white/10 transition-all uppercase tracking-widest text-[11px] flex items-center gap-4">
     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-500 ${inWishlist ? 'rotate-[135deg]' : ''}`}><path d="M12 5v14M5 12h14"/></svg>
     {inWishlist ? 'In Library' : 'Add to List'}
    </button>
    <WatchTogetherButton movieId={movieId} type={contentType} />
    </div>
   </header>

   <section className="bg-white/5 border border-white/10 !p-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
    <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20 mb-10">Synopsis</h3>
    <p className="text-xl sm:text-3xl leading-relaxed text-white/80 font-medium tracking-tight">
    {details.overview}
    </p>
   </section>
   </div>

   {/* Sidebar / TV Info Column */}
   <aside className="lg:col-span-4 flex flex-col gap-16 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
    {contentType === 'tv' ? (
    <section className="bg-white/5 border border-white/10 !p-10 flex flex-col gap-10">
    <div className="flex flex-col gap-8">
     <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20">Chapters</h3>
     
     {/* Custom Season Dropdown UI */}
     <div className="relative" ref={seasonDropdownRef}>
     <button 
      onClick={() => setIsSeasonDropdownOpen(!isSeasonDropdownOpen)}
      className="w-full flex items-center justify-between px-8 py-5 bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest text-white/90 hover:bg-white/10 transition-all"
     >
      Season {selectedSeason}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className={`transition-transform duration-300 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
     </button>
     
     {isSeasonDropdownOpen && (
      <div className="absolute top-full left-0 right-0 mt-3 bg-white/5 border border-white/10 !p-2 z-50 overflow-hidden border border-white/10 animate-fade-in">
      <div className="max-h-[300px] overflow-y-auto no-scrollbar py-2">
       {details.seasons?.filter(s => s.season_number > 0).map(s => (
       <button 
        key={s.id}
        onClick={() => {
        setSelectedSeason(s.season_number);
        setIsSeasonDropdownOpen(false);
        }}
        className={`w-full text-left px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${selectedSeason === s.season_number ? 'bg-white text-black' : 'text-white/80 hover:bg-white/5 hover:text-white'}`}
       >
        Season {s.season_number}
       </button>
       ))}
      </div>
      </div>
     )}
     </div>
    </div>
    
    <div className="max-h-[500px] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
     {loadingEpisodes ? <Spinner /> : episodes.map(ep => (
     <div 
      key={ep.id}
      onClick={() => navigate(`/player/tv/${movieId}/${selectedSeason}/${ep.episode_number}`)}
      className="flex gap-6 group cursor-pointer p-4 hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
     >
      <div className="w-28 h-20 overflow-hidden shrink-0 relative">
      <img src={getTMDBImageUrl(ep.still_path || details.backdrop_path, 'w200')} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
      </div>
      <div className="flex-1 py-1 min-w-0">
      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">E{ep.episode_number}</p>
      <p className="text-sm font-black text-white group-hover:text-red-500 transition-colors truncate">{ep.name}</p>
      <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-2">Ready to Stream</p>
      </div>
     </div>
     ))}
    </div>
    </section>
    ) : (
    /* Movie Selection / Recommendations */
    similarMovies.length > 0 && (
    <section className="bg-white/5 border border-white/10 !p-10 flex flex-col gap-10">
     <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20">More Like This</h3>
     <div className="max-h-[600px] overflow-y-auto space-y-6 pr-2 custom-scrollbar">
     {similarMovies.slice(0, 8).map(m => (
      <div 
      key={m.id}
      onClick={() => navigate(`/details/movie/${m.id}`)}
      className="flex gap-6 group cursor-pointer p-4 hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
      >
      <div className="w-24 h-32 overflow-hidden shrink-0 relative">
       <img src={getTMDBImageUrl(m.poster_path, 'w200')} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
      </div>
      <div className="flex-1 py-2 min-w-0">
       <h4 className="text-sm font-black text-white group-hover:text-red-500 transition-colors truncate mb-2">{m.title}</h4>
       <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-white/40">{m.release_date?.split('-')[0]}</span>
        <span className="text-[10px] font-black text-red-600">★ {m.vote_average?.toFixed(1)}</span>
       </div>
       <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mt-3">Discover Now</p>
      </div>
      </div>
     ))}
     </div>
    </section>
    )
    )}

    <section className="bg-white/5 border border-white/10 !p-10 flex flex-col gap-10">
    <h3 className="text-[11px] font-black uppercase tracking-[0.5em] text-white/20">Lead Cast</h3>
    <div className="grid grid-cols-2 gap-10">
     {credits?.cast?.slice(0, 4).map(c => (
     <div key={c.id} className="text-center group cursor-pointer">
      <div className="aspect-square overflow-hidden mb-5 border border-transparent group-hover:border-red-600 transition-all scale-100 group-hover:scale-105">
      <img src={c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '/no-movie.png'} className="w-full h-full object-cover transition-all duration-700" alt="" />
      </div>
      <p className="text-[10px] font-black text-white/80 uppercase tracking-widest line-clamp-1 group-hover:text-white transition-colors">{c.name}</p>
     </div>
     ))}
    </div>
    </section>
   </aside>

  </div>
  </div>
 </div>
 );
};

export default MovieDetails;