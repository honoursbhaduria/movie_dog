import { useEffect, useState, useCallback, Suspense, lazy } from 'react'
import Search from './components/Search.jsx'
import Spinner from './components/Spinner.jsx'
import MovieCard from './components/MovieCard.jsx'
import { fetchWithCache } from './utils/cache'

// Lazy load heavy components
const Wishlist = lazy(() => import('./components/Wishlist.jsx'));
const AIChatbot = lazy(() => import('./components/AIChatbot.jsx'));

import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { initAuthListener, getUser } from './utils/auth'
import { useDebounce } from 'react-use'
import { getTrendingMovies, updateSearchCount } from './supabase.js'
import { aiFilterMovies } from './utils/gemini.js'
import { addToWishlist } from './utils/wishlist.js'
import { getAllWatchProgress } from './utils/streaming.js'

const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

// Validate TMDB API Key configuration
const isTMDBConfigured = API_KEY && API_KEY !== 'your_tmdb_api_key_here' && API_KEY.length > 20;

const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  }
}

const App = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [searchTerm, setSearchTerm] = useState('');

  const [contentType, setContentType] = useState('movie'); // 'movie' or 'tv'
  const [category, setCategory] = useState('all'); // 'all', 'bollywood', 'hollywood'
  const [language, setLanguage] = useState('all'); // 'all', 'hi', 'en', etc.

  const [movieList, setMovieList] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const [trendingMovies, setTrendingMovies] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUsesLeft, setAiUsesLeft] = useState(2);
  const [authUser, setAuthUser] = useState(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const isStreamingUnlocked = localStorage.getItem('streaming_unlocked') === 'true';
  const [secretClicks, setSecretClicks] = useState(0);

  // URL Redeem Code Check
  useEffect(() => {
    const code = searchParams.get('code');
    if (code === 'HNO2@2005' && !isStreamingUnlocked) {
      localStorage.setItem('streaming_unlocked', 'true');
      // Clean up the URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('code');
      setSearchParams(newParams);
      window.location.reload();
    }
  }, [searchParams, isStreamingUnlocked, setSearchParams]);

  // Reactive auth state listener
  useEffect(() => {
    const unsub = initAuthListener((session) => {
      setAuthUser(session ? getUser() : null);
    });
    return unsub;
  }, []);

  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm])

  const fetchContent = async (query = '', page = 1, append = false) => {
    if (!isTMDBConfigured) {
      setErrorMessage('TMDB API Key is missing or invalid. Note: You must use the "API Read Access Token" (the very long one) from TMDB settings, not the shorter "API Key".');
      return;
    }

    if (append) setIsLoadingMore(true);
    else { setIsLoading(true); }
    setErrorMessage('');

    try {
      let endpoint = '';
      const params = new URLSearchParams({ page: page.toString(), include_adult: 'false', language: 'en-US' });

      if (query) {
        endpoint = `${API_BASE_URL}/search/${contentType}?query=${encodeURIComponent(query)}&${params.toString()}`;
      } else {
        // Discover with filters
        if (category === 'bollywood') {
          params.append('with_origin_country', 'IN');
          params.append('with_original_language', 'hi');
        } else if (category === 'hollywood') {
          params.append('with_origin_country', 'US');
          params.append('with_original_language', 'en');
        } else if (category === 'anime') {
          params.append('with_keywords', '210024'); // Anime keyword
          params.append('with_genres', '16'); // Anime genre
          params.append('with_original_language', 'ja');
        }

        if (language !== 'all' && category !== 'anime' && category !== 'bollywood' && category !== 'hollywood') {
          params.append('with_original_language', language);
        } else if (language !== 'all' && (category === 'bollywood' || category === 'hollywood' || category === 'anime')) {
          // If a specific language is chosen alongside a regional category, we respect the language choice
          params.set('with_original_language', language);
        }

        endpoint = `${API_BASE_URL}/discover/${contentType}?sort_by=popularity.desc&${params.toString()}`;
      }

      const data = await fetchWithCache(endpoint, API_OPTIONS);
      const newItems = data.results || [];

      if (append) setMovieList(prev => [...prev, ...newItems]);
      else setMovieList(newItems);

      setCurrentPage(data.page || page);
      setTotalPages(Math.min(data.total_pages || 0, 500));
      setTotalResults(data.total_results || 0);

      // Non-blocking update
      if (query && newItems.length > 0) {
        updateSearchCount(query, newItems[0]).catch(console.error);
      }
    } catch (error) {
      const isNetworkError = error instanceof TypeError || (error.message && (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')));
      if (isNetworkError) {
        setErrorMessage('Unable to connect to TMDB. Please check your internet or disable adblockers if you are using any.');
      } else {
        setErrorMessage(`Error fetching content. Please try again later.`);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  const handleMovieClick = useCallback((id, type) => {
    navigate(`/details/${type || contentType}/${id}`);
  }, [contentType, navigate]);

  const loadMoreContent = () => {
    if (currentPage < totalPages) fetchContent(debouncedSearchTerm, currentPage + 1, true);
  }

  const loadTrendingContent = async () => {
    try {
      const movies = await getTrendingMovies();
      if (!movies || movies.length === 0) {
        if (!isTMDBConfigured) {
          console.warn('Supabase trending empty and TMDB API Key not configured. Skipping fallback.');
          return;
        }
        try {
          const tm = await fetchWithCache(`${API_BASE_URL}/trending/${contentType}/day`, API_OPTIONS);
          setTrendingMovies((tm.results || []).slice(0, 5).map(m => ({
            $id: m.id, title: m.title || m.name, poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '', count: 0
          })));
          return;
        } catch (err) {
          const isNetworkError = err instanceof TypeError || (err.message && (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')));
          if (isNetworkError) {
            console.warn('Trending fetch blocked by network or adblocker. Check if TMDB is accessible.');
          } else {
            console.error('Fallback trending fetch failed:', err);
          }
        }
      }
      setTrendingMovies(movies || []);
    } catch (error) { 
      console.error('Error loading trending content:', error); 
    }
  }

  useEffect(() => {
    setCurrentPage(1);
    if (aiMode && debouncedSearchTerm.trim()) {
      if (aiUsesLeft <= 0) { setErrorMessage('AI searches exhausted.'); setMovieList([]); return; }
      setIsLoading(true); setAiLoading(true); setMovieList([]);
      aiFilterMovies(debouncedSearchTerm).then(movies => {
        setMovieList(movies); setTotalResults(movies.length); setAiUsesLeft(prev => prev - 1);
        setIsLoading(false); setAiLoading(false);
      }).catch(() => { setErrorMessage('AI filter failed.'); setIsLoading(false); setAiLoading(false); });
    } else fetchContent(debouncedSearchTerm, 1, false);
  }, [debouncedSearchTerm, aiMode, contentType, category, language]);

  useEffect(() => { loadTrendingContent(); }, [contentType]);

  useEffect(() => {
    const refreshProgress = () => setContinueWatching(getAllWatchProgress());
    refreshProgress();
    window.addEventListener('focus', refreshProgress);
    return () => window.removeEventListener('focus', refreshProgress);
  }, []);

  return (
    <main>
      <div className="pattern" />

      <div className="wrapper">
        <header>
          <div className="header-actions">
            {/* Desktop View */}
            <div className="hidden xs:flex items-center gap-3">
              <button className="wishlist-btn" onClick={() => setShowWishlist(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                <span>My Favorites</span>
              </button>

              {authUser ? (
                <div className="profile-menu-container">
                  <button className="user-badge profile-toggle-btn" onClick={() => { setShowProfileMenu(!showProfileMenu); setShowMobileMenu(false); }}>
                    {authUser.avatar ? <img src={authUser.avatar} alt="" className="user-avatar user-avatar--img" /> : <div className="user-avatar">{(authUser.name || authUser.email || '?').charAt(0).toUpperCase()}</div>}
                    <div className="user-info desktop-only"><span className="user-name">{authUser.name || 'User'}</span><span className="user-email">{authUser.email}</span></div>
                    <svg className={`chevron ${showProfileMenu ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                  {showProfileMenu && (
                    <div className="profile-dropdown">
                      <Link to="/logout" className="dropdown-item text-red-400">Logout</Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link to="/login" className="wishlist-btn">Login</Link>
                  <Link to="/register" className="auth-register-btn">Register</Link>
                </div>
              )}
            </div>

            {/* Mobile View (3 dots) */}
            <div className="xs:hidden profile-menu-container">
              <button className="wishlist-btn !w-10 !h-10 !p-0 flex items-center justify-center rounded-full" onClick={() => { setShowMobileMenu(!showMobileMenu); setShowProfileMenu(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
                </svg>
              </button>
              
              {showMobileMenu && (
                <div className="profile-dropdown">
                  <button className="dropdown-item" onClick={() => { setShowWishlist(true); setShowMobileMenu(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    My Favorites
                  </button>
                  
                  {authUser ? (
                    <>
                      <div className="h-px bg-white/10 my-1" />
                      <Link to="/logout" className="dropdown-item text-red-400">Logout</Link>
                    </>
                  ) : (
                    <>
                      <div className="h-px bg-white/10 my-1" />
                      <Link to="/login" className="dropdown-item">Login</Link>
                      <Link to="/register" className="dropdown-item">Register</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <img src="/hero.png" alt="Hero" className="mx-auto w-[80%] sm:w-full max-w-[500px] h-auto mb-8 object-contain" />
          <h1>Find <span className="text-gradient">{contentType === 'movie' ? 'Movies' : 'Web Series'}</span> You'll Enjoy Without the Hassle</h1>

          <Search 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            aiMode={aiMode} 
            setAiMode={setAiMode} 
            aiUsesLeft={aiUsesLeft}
            contentType={contentType}
            setContentType={setContentType}
            category={category}
            setCategory={setCategory}
            language={language}
            setLanguage={setLanguage}
            isStreamingUnlocked={isStreamingUnlocked}
          />
        </header>

        {continueWatching.length > 0 && !searchTerm && (
          <section className="trending mb-20">
            <h2 className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Continue Watching
            </h2>
            <ul className="mt-4">
              {continueWatching.slice(0, 10).map((item) => (
                <li key={item.id} onClick={() => {
                  if (!isStreamingUnlocked) {
                    navigate(`/details/${item.metadata.type}/${item.id}`);
                    return;
                  }
                  if (item.metadata.type === 'tv') {
                    navigate(`/player/tv/${item.id}/${item.metadata.season}/${item.metadata.episode}`);
                  } else {
                    navigate(`/player/movie/${item.id}`);
                  }
                }} className="cursor-pointer group relative">
                   <div className="relative overflow-hidden rounded-lg">
                      <img src={item.metadata.poster_url} alt={item.metadata.title} className="group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                         </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                         <div className="h-full bg-red-600" style={{ width: `${item.progress}%` }} />
                      </div>
                   </div>
                   <div className="mt-3 px-1">
                      <p className="text-white font-bold text-sm truncate">{item.metadata.title}</p>
                      {item.metadata.type === 'tv' && (
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                          S{item.metadata.season} E{item.metadata.episode}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-500 mt-0.5">{Math.floor(item.progress)}% Watched</p>
                   </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending {contentType === 'movie' ? 'Movies' : 'Web Series'}</h2>
            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id} onClick={() => handleMovieClick(movie.$id, contentType)} className="cursor-pointer">
                  <p>{index + 1}</p><img src={movie.poster_url} alt={movie.title} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="all-movies mt-20">
          <h2>{aiMode && debouncedSearchTerm ? 'AI Results' : `All ${contentType === 'movie' ? 'Movies' : 'Web Series'}`}</h2>
          {isLoading ? <Spinner /> : errorMessage ? <p className="text-red-500">{errorMessage}</p> : (
            <>
              <ul>
                {movieList.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} onClick={() => handleMovieClick(movie.id, contentType)} />
                ))}
              </ul>

              {movieList.length === 0 && !isLoading && debouncedSearchTerm && (
                <div className="text-center py-10">
                  <p className="text-gray-200 text-lg">No results found for "{debouncedSearchTerm}" in {contentType === 'movie' ? 'Movies' : 'Web Series'}.</p>
                  <button 
                    className="mt-4 text-primary hover:underline"
                    onClick={() => setContentType(contentType === 'movie' ? 'tv' : 'movie')}
                  >
                    Try searching in {contentType === 'movie' ? 'Web Series' : 'Movies'}?
                  </button>
                </div>
              )}

              {currentPage < totalPages && (
                <div className="flex justify-center mt-10">
                  <button onClick={loadMoreContent} disabled={isLoadingMore} className="load-more-btn">{isLoadingMore ? 'Loading...' : 'Load More'}</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <Suspense fallback={<Spinner />}>
        {showWishlist && <Wishlist onMovieClick={(id, type) => { setShowWishlist(false); handleMovieClick(id, type); }} onClose={() => setShowWishlist(false)} />}
      </Suspense>

      <Suspense fallback={null}>
        <AIChatbot isOpen={chatbotOpen} onClose={() => setChatbotOpen(false)} onMovieClick={async (movie) => { await addToWishlist(movie); setChatbotOpen(false); handleMovieClick(movie.id, 'movie'); }} />
      </Suspense>

      {!chatbotOpen && (
        <button className={`chatbot-fab ${isStreamingUnlocked ? 'chatbot-fab--glow' : ''}`} onClick={() => setChatbotOpen(true)} title="Chat with AI">
          <img src="/logo.png" alt="Bot" className="chatbot-fab-logo" />
        </button>
      )}

      <footer className="footer bg-dark-100/50 backdrop-blur-md mt-20 py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 relative">
            <button className="hidden-btn" onClick={() => {
              const newClicks = secretClicks + 1;
              if (newClicks >= 5) {
                const ns = !isStreamingUnlocked;
                localStorage.setItem('streaming_unlocked', ns.toString());
                setSecretClicks(0);
                window.location.reload();
              } else setSecretClicks(newClicks);
            }} aria-label="Secret Toggle">
              DEBUG
            </button>
            <p>© 2026 MovieDog. All rights reserved.</p>
          </div>
          <div className="flex gap-6"><a href="#">Privacy</a><a href="#">Terms</a></div>
        </div>
      </footer>
    </main>
  )
}

export default App
