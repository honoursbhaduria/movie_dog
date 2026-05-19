import { useEffect, useState, useCallback, Suspense, lazy } from 'react'
import Search from './components/Search.jsx'
import Spinner from './components/Spinner.jsx'
import MovieCard from './components/MovieCard.jsx'
import Hero from './components/Hero.jsx'

// Lazy load heavy components
const Wishlist = lazy(() => import('./components/Wishlist.jsx'));
const AIChatbot = lazy(() => import('./components/AIChatbot.jsx'));

import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { initAuthListener, getUser } from './utils/auth'
import { useDebounce } from 'react-use'
import { getTrendingMovies, updateSearchCount } from './supabase.js'
import { aiFilterMovies } from './utils/gemini.js'
import { addToWishlist } from './utils/wishlist.js'

const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

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
  const [showWishlist, setShowWishlist] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUsesLeft, setAiUsesLeft] = useState(2);
  const [authUser, setAuthUser] = useState(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
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
    if (append) setIsLoadingMore(true);
    else { setIsLoading(true); setMovieList([]); }
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
          params.append('with_original_language', 'ja');
        }

        if (language !== 'all') {
          params.append('with_original_language', language);
        }

        endpoint = `${API_BASE_URL}/discover/${contentType}?sort_by=popularity.desc&${params.toString()}`;
      }

      const response = await fetch(endpoint, API_OPTIONS);
      if (!response.ok) throw new Error(`Failed to fetch content`);
      const data = await response.json();
      const newItems = data.results || [];

      if (append) setMovieList(prev => [...prev, ...newItems]);
      else setMovieList(newItems);

      setCurrentPage(data.page || page);
      setTotalPages(Math.min(data.total_pages || 0, 500));
      setTotalResults(data.total_results || 0);

      if (query && newItems.length > 0) await updateSearchCount(query, newItems[0]);
    } catch (error) {
      setErrorMessage(`Error fetching content. Please try again later.`);
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
        const resp = await fetch(`${API_BASE_URL}/trending/${contentType}/day`, API_OPTIONS);
        if (resp && resp.ok) {
          const tm = await resp.json();
          setTrendingMovies((tm.results || []).slice(0, 5).map(m => ({
            $id: m.id, title: m.title || m.name, poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '', count: 0
          })));
          return;
        }
      }
      setTrendingMovies(movies);
    } catch (error) { console.error(error); }
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

  return (
    <main>
      <div className="pattern" />

      <div className="wrapper">
        <header>
          <div className="header-actions">
            {authUser ? (
              <div className="profile-menu-container">
                <button className="user-badge profile-toggle-btn" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                  {authUser.avatar ? <img src={authUser.avatar} alt="" className="user-avatar user-avatar--img" /> : <div className="user-avatar">{(authUser.name || authUser.email || '?').charAt(0).toUpperCase()}</div>}
                  <div className="user-info desktop-only"><span className="user-name">{authUser.name || 'User'}</span><span className="user-email">{authUser.email}</span></div>
                  <svg className={`chevron ${showProfileMenu ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                {showProfileMenu && (
                  <div className="profile-dropdown">
                    <button className="dropdown-item" onClick={() => { setShowWishlist(true); setShowProfileMenu(false); }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> My Favorites
                    </button>
                    <Link to="/logout" className="dropdown-item text-red-400">Logout</Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="profile-menu-container">
                <div className="flex items-center gap-3">
                  <button className="wishlist-btn desktop-only" onClick={() => setShowWishlist(true)}>My Favorites</button>
                  <Link to="/login" className="wishlist-btn">Login</Link>
                  <Link to="/register" className="auth-register-btn">Register</Link>
                </div>
              </div>
            )}
          </div>

          <Hero onCardClick={(id) => handleMovieClick(id, 'movie')} />
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
        <button className={`chatbot-fab ${!isStreamingUnlocked ? 'chatbot-fab--glow' : ''}`} onClick={() => setChatbotOpen(true)} title="Chat with AI">
          <img src="/logo.png" alt="Bot" className="chatbot-fab-logo" />
        </button>
      )}

      <footer className="footer bg-dark-100/50 backdrop-blur-md mt-20 py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button className="hidden-btn" onClick={() => {
              const newClicks = secretClicks + 1;
              if (newClicks >= 5) {
                const ns = !isStreamingUnlocked;
                localStorage.setItem('streaming_unlocked', ns.toString());
                setSecretClicks(0);
                window.location.reload(); // Force reload to apply state
              } else setSecretClicks(newClicks);
            }}>v1.0.4</button>
            <p>© 2026 MovieDog. All rights reserved.</p>
          </div>
          <div className="flex gap-6"><a href="#">Privacy</a><a href="#">Terms</a></div>
        </div>
      </footer>
    </main>
  )
}

export default App
