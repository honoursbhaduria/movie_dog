import { useEffect, useState, useCallback, Suspense, lazy, useRef } from 'react'
import Spinner from './components/Spinner.jsx'
import MovieCard from './components/MovieCard.jsx'
import Sidebar from './components/Sidebar.jsx'
import Hero from './components/Hero.jsx'
import HorizontalScroll from './components/HorizontalScroll.jsx'
import Tabs from './components/Tabs.jsx'
import Footer from './components/Footer.jsx'
import Wishlist from './components/Wishlist.jsx'
import FeaturedSection from './components/FeaturedSection.jsx'
import GridBackground from './components/GridBackground.jsx'

import { useNavigate } from 'react-router-dom'
import { initAuthListener, getUser } from './utils/auth'
import { useDebounce } from 'react-use'
import { getTrendingMovies } from './supabase.js'
import { aiFilterMovies } from './utils/gemini.js'
import { addToWishlist } from './utils/wishlist.js'
import { getAllWatchProgress } from './utils/streaming.js'

import { getTMDBImageUrl } from './utils/image.js'
import { tmdbFetch, TMDB_API_KEY } from './utils/tmdb'

const API_KEY = TMDB_API_KEY;

// Validate TMDB API Key configuration
const isTMDBConfigured = API_KEY && API_KEY !== 'your_tmdb_api_key_here' && API_KEY.length > 20;

const App = () => {
 const navigate = useNavigate();
 const resultsRef = useRef(null);
 const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
 const [searchTerm, setSearchTerm] = useState('');

 const [movieList, setMovieList] = useState([]);
 const [popularMovies, setPopularMovies] = useState([]);
 const [featuredMovie, setFeaturedMovie] = useState(null);
 
 const [isLoading, setIsLoading] = useState(false);
 const [isLoadingMore, setIsLoadingMore] = useState(false);

 const [currentPage, setCurrentPage] = useState(1);
 const [totalPages, setTotalPages] = useState(0);

 const [trendingMovies, setTrendingMovies] = useState([]);
 const [continueWatching, setContinueWatching] = useState([]);
 const [showWishlist, setShowWishlist] = useState(false);
 const [aiMode, setAiMode] = useState(false);
 const [aiUsesLeft, setAiUsesLeft] = useState(10);
 const [authUser, setAuthUser] = useState(null);
 const [chatbotOpen, setChatbotOpen] = useState(false);
 const [showToast, setShowToast] = useState(false);

 const handleChatbotClick = () => {
 setShowToast(true);
 setTimeout(() => setShowToast(false), 3000);
 };

 const [activeTab, setActiveTab] = useState('Trending');
 const [activePill, setActivePill] = useState('All');

 const [isSearchOpen, setIsSearchOpen] = useState(false);
 const [suggestions, setSuggestions] = useState([]);
 const [isSuggesting, setIsSuggesting] = useState(false);
 const searchInputRef = useRef(null);

 // Fetch Smart Suggestions
 useEffect(() => {
 const fetchSuggestions = async () => {
  if (debouncedSearchTerm.length > 2) {
  setIsSuggesting(true);
  try {
   const { getSmartSuggestions } = await import('./utils/gemini');
   const data = await getSmartSuggestions(debouncedSearchTerm);
   setSuggestions(data);
  } catch (e) {
   setSuggestions([]);
  } finally {
   setIsSuggesting(false);
  }
  } else {
  setSuggestions([]);
  }
 };
 fetchSuggestions();
 }, [debouncedSearchTerm]);

 const handleTabChange = (tab) => {
 setActiveTab(tab);
 setSearchTerm(''); // Clear search when switching categories
 };

 const handlePillChange = (pill) => {
 setActivePill(pill);
 setSearchTerm(''); // Clear search when browsing by genre
 };
 const [backgroundMovie, setBackgroundMovie] = useState(null);
 const [prevBackgroundMovie, setPrevBackgroundMovie] = useState(null);
 const [isSliding, setIsSliding] = useState(false);

 // Transition background
 useEffect(() => {
 if (backgroundMovie) {
  setIsSliding(true);
  const timer = setTimeout(() => {
  setPrevBackgroundMovie(backgroundMovie);
  setIsSliding(false);
  }, 1500); // Match index.css animation duration
  return () => clearTimeout(timer);
 }
 }, [backgroundMovie]);

 // Reactive auth state listener
 useEffect(() => {
 const unsub = initAuthListener((session) => {
  setAuthUser(session ? getUser() : null);
 });
 return unsub;
 }, []);

 useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm])

 const fetchFeatured = useCallback(async () => {
 try {
  const data = await tmdbFetch('/movie/popular', { page: '1' });
  if (data.results && data.results.length > 0) {
  // Find first movie with a backdrop for the Hero
  const movieWithBackdrop = data.results.find(m => m.backdrop_path) || data.results[0];
  setFeaturedMovie(movieWithBackdrop);
  setPopularMovies(data.results.slice(0, 15));
  }
 } catch (error) {
  console.error('Failed to fetch featured movie:', error);
 }
 }, []);

 const fetchContent = useCallback(async (query = '', page = 1, append = false) => {
 if (!isTMDBConfigured) return;

 if (append) setIsLoadingMore(true);
 else { setIsLoading(true); }

 try {
  let endpoint = '';
  const params = { page: page.toString(), include_adult: 'false', language: 'en-US' };

  if (query) {
  endpoint = `/search/movie`;
  params.query = query;
  } else {
  // Map Tabs and Pills to TMDB
  const genreMapping = {
   'Action': 28,
   'Adventure': 12,
   'Animation': 16,
   'Fiction': 878,
   'Heroes': 28,
   'Comedy': 35,
   'Anime': 16
  };

  const internalContentType = activeTab === 'Webseries' ? 'tv' : 'movie';

  if (activeTab === 'Trending') {
   endpoint = `/trending/${internalContentType}/week`;
  } else {
   endpoint = `/discover/${internalContentType}`;
   
   if (activeTab === 'Popular' || activeTab === 'Webseries') params.sort_by = 'popularity.desc';
   else if (activeTab === 'Recently added') params.sort_by = internalContentType === 'movie' ? 'release_date.desc' : 'first_air_date.desc';
   else if (activeTab === 'Premium') {
   params.sort_by = 'vote_average.desc';
   params['vote_count.gte'] = '500';
   }
   
   if (activePill && activePill !== 'All' && genreMapping[activePill]) {
   params.with_genres = genreMapping[activePill];
   }

   // Japanese Animation logic
   if (activePill === 'Anime') {
   params.with_original_language = 'ja';
   }
  }
  }

  const data = await tmdbFetch(endpoint, params);
  let newItems = (data.results || []).map(item => ({
   ...item,
   media_type: activeTab === 'Webseries' ? 'tv' : 'movie'
  }));

  if (append) setMovieList(prev => [...prev, ...newItems]);
  else {
  setMovieList(newItems);
  if (!featuredMovie && newItems.length > 0) {
   setFeaturedMovie(newItems.find(m => m.backdrop_path) || newItems[0]);
  }
  }

  setCurrentPage(data.page || page);
  setTotalPages(Math.min(data.total_pages || 0, 500));
 } catch (error) {
  console.error('Unable to connect to TMDB:', error);
 } finally {
  setIsLoading(false);
  setIsLoadingMore(false);
 }
 }, ["movie", featuredMovie, activeTab, activePill]);

 const handleMovieClick = useCallback((id, type = 'movie') => {
 navigate(`/details/${type}/${id}`);
 }, [navigate]);

 const loadMoreContent = () => {
 if (currentPage < totalPages) fetchContent(debouncedSearchTerm, currentPage + 1, true);
 }

 const loadTrendingContent = useCallback(async () => {
 try {
  const movies = await getTrendingMovies();
  if (!movies || movies.length === 0) {
  if (!isTMDBConfigured) return;
  try {
   const data = await tmdbFetch(`/trending/${"movie"}/day`);
   setTrendingMovies((data.results || []).slice(0, 5).map(m => ({
   $id: m.id, title: m.title || m.name, poster_url: getTMDBImageUrl(m.poster_path, 'w500'), count: 0
   })));
  } catch (err) { setTrendingMovies([]); }
  } else { setTrendingMovies(movies); }
 } catch (error) { setTrendingMovies([]); }
 }, ["movie"]);

 useEffect(() => { fetchFeatured(); }, [fetchFeatured]);

 useEffect(() => {
 const handleSearch = async () => {
  if (aiMode && debouncedSearchTerm.trim()) {
  if (aiUsesLeft <= 0) { setMovieList([]); return; }
  setIsLoading(true); setMovieList([]);
  try {
   const movies = await aiFilterMovies(debouncedSearchTerm, "movie");
   setMovieList(movies); setAiUsesLeft(prev => prev - 1);
  } catch (error) { console.error(error); }
  finally { setIsLoading(false); }
  } else {
  await fetchContent(debouncedSearchTerm, 1, false);
  }
 };
 handleSearch();
 }, [debouncedSearchTerm, aiMode, "movie", aiUsesLeft, fetchContent, activeTab, activePill]);

 useEffect(() => { loadTrendingContent(); }, ["movie", loadTrendingContent]);

 useEffect(() => {
 const refreshProgress = () => setContinueWatching(getAllWatchProgress());
 refreshProgress();
 window.addEventListener('focus', refreshProgress);
 return () => window.removeEventListener('focus', refreshProgress);
 }, []);

 return (
 <main className="relative bg-[#000000] min-h-screen">
  {/* Global Ambient Background */}
  <div className="fixed inset-0 z-0 pointer-events-none">
  {backgroundMovie && (
   <img 
   key={backgroundMovie.id}
   src={getTMDBImageUrl(backgroundMovie.backdrop_path || backgroundMovie.poster_path, 'w500')} 
   className="w-full h-full object-cover opacity-[0.15] blur-[100px] scale-150 transition-all duration-1000"
   alt=""
   />
  )}
  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
  </div>

  <GridBackground movies={popularMovies} />

  <Sidebar onWishlistToggle={() => setShowWishlist(prev => !prev)} />
  
  {/* Global Pro Search Toggle */}
  <div className="fixed top-8 right-12 z-[300] flex flex-col items-end gap-4">
  <div className="flex items-center gap-4">
   <div className={`flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-4 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${isSearchOpen ? 'w-[450px] opacity-100 ' : 'w-0 opacity-0 !p-0 '}`}>
   <input
    ref={searchInputRef}
    type="text"
    placeholder="Search titles, actors, genres..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    onKeyDown={(e) => e.key === 'Enter' && resultsRef.current?.scrollIntoView({ behavior: 'smooth' })}
    className="bg-transparent outline-none text-white text-[11px] font-black uppercase tracking-[0.4em] w-full placeholder:text-white/10"
   />
   </div>
   
   <button 
   onClick={() => {
    setIsSearchOpen(!isSearchOpen);
    if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 100);
   }}
   className={`w-16 h-14 flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-90 ${isSearchOpen ? 'bg-white ' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
   >
   {isSearchOpen ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
   ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
   )}
   </button>
  </div>

  {/* Smart Suggestions Dropdown */}
  {isSearchOpen && (suggestions.length > 0 || isSuggesting) && (
   <div className="w-[450px] mr-[80px] bg-white/5 border border-white/10 border border-white/5">
   <div className="flex flex-col gap-4">
    {suggestions.map((s) => (
    <div 
     key={s.id} 
     onClick={() => { handleMovieClick(s.id, s.media_type || 'movie'); setIsSearchOpen(false); }}
     className="group flex items-center gap-4 p-3 hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/5"
    >
     <img src={getTMDBImageUrl(s.poster_path, 'w92')} className="w-10 h-14 object-cover group-hover:scale-110 transition-transform" alt="" />
     <div className="flex-1 min-w-0">
     <p className="text-white font-black text-[12px] truncate uppercase tracking-widest">{s.title || s.name}</p>
     <div className="flex items-center gap-3 mt-1.5">
      <span className="text-white/40 text-[10px] font-bold">{(s.release_date || s.first_air_date || '').split('-')[0]}</span>
      <span className="text-red-500 text-[10px] font-black">★ {s.vote_average?.toFixed(1)}</span>
     </div>
     </div>
    </div>
    ))}
   </div>
   </div>
  )}
  </div>

  <div className="main-content relative z-10">
  <Hero 
   stackMovies={popularMovies}
   onWatchNow={(id) => handleMovieClick(id, 'movie')}
   onTrailer={(id) => handleMovieClick(id, 'movie')}
   onActiveMovieChange={setBackgroundMovie}
   resultsRef={resultsRef}
  />

  <HorizontalScroll 
   title="Popular Movies"
   movies={popularMovies}
   onMovieClick={(id) => handleMovieClick(id, 'movie')}
  />

  <div ref={resultsRef}>
   <Tabs 
   activeTab={activeTab}
   onTabChange={handleTabChange}
   activePill={activePill}
   onPillChange={handlePillChange}
   />
  </div>

  <section className="movie-grid px-12 md:px-32">
   {isLoading ? (
   <div className="col-span-full flex justify-center py-20"><Spinner /></div>
   ) : movieList.slice(0, 12).map((movie) => (
   <MovieCard 
    key={movie.id} 
    movie={movie} 
    onClick={() => handleMovieClick(movie.id, movie.media_type || (activeTab === 'Webseries' ? 'tv' : "movie"))} 
   />
   ))}
  </section>

  {!isLoading && movieList.length > 12 && (
   <FeaturedSection 
   movie={movieList[Math.min(12, movieList.length - 1)]} 
   onWatch={(id) => handleMovieClick(id, activeTab === 'Webseries' ? 'tv' : "movie")}
   onWishlist={addToWishlist}
   />
  )}

  <section className="movie-grid px-12 md:px-32 mt-20">
   {!isLoading && movieList.slice(13).map((movie) => (
   <MovieCard 
    key={movie.id} 
    movie={movie} 
    onClick={() => handleMovieClick(movie.id, movie.media_type || (activeTab === 'Webseries' ? 'tv' : "movie"))} 
   />
   ))}
  </section>

  {currentPage < totalPages && (
   <div className="flex justify-center mb-20 px-12 md:px-32">
   <button 
    onClick={loadMoreContent} 
    disabled={isLoadingMore} 
    className="px-12 py-4 bg-white/5 border border-white/10 !border-white/5 text-[10px] font-black uppercase tracking-[0.4em] text-white/30 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-4 group"
   >
    {isLoadingMore ? (
    <div className="w-4 h-4 border-2 border-white/10 border-t-white animate-spin" />
    ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="group-hover:translate-y-0.5 transition-transform"><path d="M12 5v14M5 12h14"/></svg>
    )}
    Discover More
   </button>
   </div>
  )}

  {continueWatching.length > 0 && !searchTerm && (
   <section className="px-6 md:px-12 py-10 border-t border-white/5">
   <h2 className="flex items-center gap-2 mb-6"><span className="w-2 h-2 bg-red-500 animate-pulse" />Continue Watching</h2>
   <div className="flex overflow-x-auto gap-6 no-scrollbar">
    {continueWatching.slice(0, 10).map((item) => (
    <div key={item.id} onClick={() => item.metadata.type === 'tv' ? navigate(`/player/tv/${item.id}/${item.metadata.season}/${item.metadata.episode}`) : navigate(`/player/movie/${item.id}`)} className="cursor-pointer group min-w-[200px]">
     <div className="relative overflow-hidden aspect-video">
      <img src={item.metadata.poster_url} alt={item.metadata.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
       <div className="w-12 h-12 bg-white/5 border border-white/10 !border-white/10 flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform duration-500">
       <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
       </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
       <div className="h-full bg-accent" style={{ width: `${item.progress}%` }} />
      </div>
     </div>
     <div className="mt-3">
      <p className="text-white font-bold text-sm truncate">{item.metadata.title}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{Math.floor(item.progress)}% Watched</p>
     </div>
    </div>
    ))}
   </div>
   </section>
  )}

  <Footer movies={popularMovies} />
  </div>

  {showWishlist && <Wishlist onMovieClick={(id, type) => { setShowWishlist(false); handleMovieClick(id, type); }} onClose={() => setShowWishlist(false)} />}
  
  {/* AI Chatbot - Disabled for now with Coming Soon notification */}
  {showToast && (
  <div className="fixed bottom-24 right-8 z-[600] bg-red-600 text-white px-6 py-3 font-black text-[10px] uppercase tracking-[0.2em] animate-fade-in-up">
   AI Assistant Coming Soon
  </div>
  )}
  
  <button 
   className="fixed bottom-8 right-8 w-14 h-14 flex items-center justify-center z-50 transition-all duration-500 hover:scale-110 active:scale-90 group" 
   onClick={handleChatbotClick} 
   title="Chat with AI"
  >
    {/* Minimalist Glass Background */}
    <div className="absolute inset-0 bg-white/5 backdrop-blur-md border border-white/10 group-hover:bg-white/10 transition-colors" />

    {/* Yelp Icon */}
    <svg width="28" height="28" viewBox="0 0 32 32" className="relative z-10 transition-transform duration-500 group-hover:rotate-12" fill="#FFFFFF">
     <path d="M13.961 22.279c0.246-0.273 0.601-0.444 0.995-0.444 0.739 0 1.338 0.599 1.338 1.338 0 0.016-0 0.032-0.001 0.048l0-0.002-0.237 6.483c-0.027 0.719-0.616 1.293-1.34 1.293-0.077 0-0.153-0.006-0.226-0.019l0.008 0.001c-1.763-0.303-3.331-0.962-4.69-1.902l0.039 0.025c-0.351-0.245-0.578-0.647-0.578-1.102 0-0.346 0.131-0.661 0.346-0.898l-0.001 0.001 4.345-4.829zM12.853 20.434l-6.301 1.572c-0.097 0.025-0.208 0.039-0.322 0.039-0.687 0-1.253-0.517-1.332-1.183l-0.001-0.006c-0.046-0.389-0.073-0.839-0.073-1.295 0-1.324 0.223-2.597 0.635-3.781l-0.024 0.081c0.183-0.534 0.681-0.911 1.267-0.911 0.214 0 0.417 0.050 0.596 0.14l-0.008-0.004 5.833 2.848c0.45 0.221 0.754 0.677 0.754 1.203 0 0.623-0.427 1.147-1.004 1.294l-0.009 0.002zM13.924 15.223l-6.104-10.574c-0.112-0.191-0.178-0.421-0.178-0.667 0-0.529 0.307-0.987 0.752-1.204l0.008-0.003c1.918-0.938 4.153-1.568 6.511-1.761l0.067-0.004c0.031-0.003 0.067-0.004 0.104-0.004 0.738 0 1.337 0.599 1.337 1.337 0 0.001 0 0.001 0 0.002v-0 12.207c-0 0.739-0.599 1.338-1.338 1.338-0.493 0-0.923-0.266-1.155-0.663l-0.003-0.006zM19.918 20.681l6.176 2.007c0.541 0.18 0.925 0.682 0.925 1.274 0 0.209-0.048 0.407-0.134 0.584l0.003-0.008c-0.758 1.569-1.799 2.889-3.068 3.945l-0.019 0.015c-0.23 0.19-0.527 0.306-0.852 0.306-0.477 0-0.896-0.249-1.134-0.625l-0.003-0.006-3.449-5.51c-0.128-0.201-0.203-0.446-0.203-0.709 0-0.738 0.598-1.336 1.336-1.336 0.147 0 0.289 0.024 0.421 0.068l-0.009-0.003zM26.197 16.742l-6.242 1.791c-0.11 0.033-0.237 0.052-0.368 0.052-0.737 0-1.335-0.598-1.335-1.335 0-0.282 0.087-0.543 0.236-0.758l-0.003 0.004 3.63-5.383c0.244-0.358 0.65-0.59 1.111-0.59 0.339 0 0.649 0.126 0.885 0.334l-0.001-0.001c1.25 1.104 2.25 2.459 2.925 3.99l0.029 0.073c0.070 0.158 0.111 0.342 0.111 0.535 0 0.608-0.405 1.121-0.959 1.286l-0.009 0.002z"></path>
    </svg>
  </button>
  </main>
  )
  }
export default App
