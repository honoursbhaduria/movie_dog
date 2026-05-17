import { useEffect, useState } from 'react'
import Search from './components/Search.jsx'
import Spinner from './components/Spinner.jsx'
import MovieCard from './components/MovieCard.jsx'
import MovieDetails from './components/MovieDetails.jsx'
import Wishlist from './components/Wishlist.jsx'
import AIChatbot from './components/AIChatbot.jsx'

import { Link } from 'react-router-dom'
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
  const [selectedContent, setSelectedContent] = useState(null);
  const [showWishlist, setShowWishlist] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUsesLeft, setAiUsesLeft] = useState(2);
  const [authUser, setAuthUser] = useState(null);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Reactive auth state listener
  useEffect(() => {
    const unsub = initAuthListener((session) => {
      setAuthUser(session ? getUser() : null);
    });
    return unsub;
  }, []);

  // Debounce the search term to prevent making too many API requests
  // by waiting for the user to stop typing for 500ms
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm])

  const fetchContent = async (query = '', page = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setMovieList([]);
    }
    setErrorMessage('');

    try {
      let endpoint = '';
      const params = new URLSearchParams({
        page: page.toString(),
        include_adult: 'false',
        language: 'en-US'
      });

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
        }

        if (language !== 'all') {
          params.append('with_original_language', language);
        }

        endpoint = `${API_BASE_URL}/discover/${contentType}?sort_by=popularity.desc&${params.toString()}`;
      }

      const response = await fetch(endpoint, API_OPTIONS);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${contentType === 'movie' ? 'movies' : 'web series'}`);
      }

      const data = await response.json();

      const newItems = data.results || [];

      if (append) {
        setMovieList(prev => [...prev, ...newItems]);
      } else {
        setMovieList(newItems);
      }

      setCurrentPage(data.page || page);
      setTotalPages(Math.min(data.total_pages || 0, 500));
      setTotalResults(data.total_results || 0);

      if (query && newItems.length > 0) {
        await updateSearchCount(query, newItems[0]);
      }
    } catch (error) {
      console.error(`Error fetching content: ${error}`);
      setErrorMessage(`Error fetching ${contentType === 'movie' ? 'movies' : 'web series'}. Please try again later.`);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  const loadMoreContent = () => {
    if (currentPage < totalPages) {
      fetchContent(debouncedSearchTerm, currentPage + 1, true);
    }
  }

  const loadTrendingContent = async () => {
    try {
      const movies = await getTrendingMovies();

      if (!movies || movies.length === 0) {
        try {
          const resp = await fetch(`${API_BASE_URL}/trending/${contentType}/day`, API_OPTIONS);
          if (resp && resp.ok) {
            const tm = await resp.json();
            const top = (tm.results || []).slice(0, 5).map(m => ({
              $id: m.id,
              title: m.title || m.name,
              poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
              count: 0
            }));
            setTrendingMovies(top);
            return;
          }
        } catch (err) {
          console.error('Error fetching TMDb trending fallback:', err);
        }
      }

      setTrendingMovies(movies);
    } catch (error) {
      console.error(`Error fetching trending content: ${error}`);
    }
  }

  useEffect(() => {
    setCurrentPage(1);

    if (aiMode && debouncedSearchTerm.trim()) {
      if (aiUsesLeft <= 0) {
        setErrorMessage('You\'ve used your 2 free AI searches. Switch back to normal search.');
        setMovieList([]);
        return;
      }

      setIsLoading(true);
      setAiLoading(true);
      setMovieList([]);
      setErrorMessage('');
      setTotalPages(0);
      setTotalResults(0);

      aiFilterMovies(debouncedSearchTerm).then(movies => {
        setMovieList(movies);
        setTotalResults(movies.length);
        setAiUsesLeft(prev => prev - 1);
        setIsLoading(false);
        setAiLoading(false);
      }).catch((err) => {
        setErrorMessage(err.message || 'AI filter failed. Try again.');
        setIsLoading(false);
        setAiLoading(false);
      });
    } else {
      fetchContent(debouncedSearchTerm, 1, false);
    }
  }, [debouncedSearchTerm, aiMode, contentType, category, language]);

  useEffect(() => {
    loadTrendingContent();
  }, [contentType]);

  return (
    <main>
      <div className="pattern" />

      <div className="wrapper">
        <header>
          <div className="header-actions">
            {authUser ? (
              <div className="profile-menu-container">
                <button
                  className="user-badge profile-toggle-btn"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  aria-expanded={showProfileMenu}
                >
                  {authUser.avatar ? (
                    <img src={authUser.avatar} alt="" className="user-avatar user-avatar--img" />
                  ) : (
                    <div className="user-avatar">
                      {(authUser.name || authUser.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="user-info desktop-only">
                    {authUser.name && <span className="user-name">{authUser.name}</span>}
                    <span className="user-email">{authUser.email}</span>
                  </div>
                  <svg className={`chevron ${showProfileMenu ? 'open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>

                {showProfileMenu && (
                  <div className="profile-dropdown">
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowWishlist(true);
                        setShowProfileMenu(false);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                      My Favorites
                    </button>
                    <Link to="/logout" className="dropdown-item text-red-400" onClick={() => setShowProfileMenu(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                      Logout
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  className="wishlist-btn"
                  onClick={() => setShowWishlist(true)}
                  title="View Wishlist"
                >
                  My Favorites
                </button>
                <Link to="/login" className="wishlist-btn" style={{ marginLeft: 12 }}>Login</Link>
                <Link to="/register" className="auth-register-btn" style={{ marginLeft: 8 }}>Register</Link>
              </>
            )}
          </div>

          <img src="/hero.png" alt="Hero Banner" />
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
          />
        </header>

        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending {contentType === 'movie' ? 'Movies' : 'Web Series'}</h2>

            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index + 1}</p>
                  <img src={movie.poster_url} alt={movie.title} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {!authUser && (
          <div className="login-cta">
            <div className="login-cta-content">
              <p className="login-cta-title">Unlock the Full Experience</p>
              <p className="login-cta-desc">
                Create a free account to access premium features
              </p>
              <div className="login-cta-features">
                <span className="login-cta-feature">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AB8BFF" strokeWidth="2"><path d="M12 2l2.09 6.91L21 12l-6.91 2.09L12 21l-2.09-6.91L3 12l6.91-2.09L12 2z" /></svg>
                  AI Recommendations
                </span>
                <span className="login-cta-feature">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AB8BFF" strokeWidth="2"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" /></svg>
                  Cloud Favorites
                </span>
                <span className="login-cta-feature">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#AB8BFF" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                  Personalized Picks
                </span>
              </div>
            </div>
            <div className="login-cta-actions">
              <Link to="/register" className="login-cta-btn login-cta-btn--primary">Sign Up Free</Link>
              <Link to="/login" className="login-cta-btn login-cta-btn--secondary">Login</Link>
            </div>
          </div>
        )}

        <section className="all-movies">
          <h2>{aiMode && debouncedSearchTerm ? 'AI Results' : `All ${contentType === 'movie' ? 'Movies' : 'Web Series'}`}</h2>
          {totalResults > 0 && (
            <p className="text-gray-200 text-sm mb-4">
              {aiMode && debouncedSearchTerm
                ? `Found ${movieList.length} items matching your description`
                : `Showing ${movieList.length} of ${totalResults.toLocaleString()} items`}
            </p>
          )}

          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className="text-red-500">{errorMessage}</p>
          ) : (
            <>
              <ul>
                {movieList.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    movie={movie}
                    onClick={() => setSelectedContent({ id: movie.id, type: contentType })}
                  />
                ))}
              </ul>

              {currentPage < totalPages && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={loadMoreContent}
                    disabled={isLoadingMore}
                    className="load-more-btn"
                  >
                    {isLoadingMore ? 'Loading...' : `Load More (Page ${currentPage + 1} of ${totalPages})`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {selectedContent && (
        <MovieDetails
          movieId={selectedContent.id}
          contentType={selectedContent.type}
          onClose={() => setSelectedContent(null)}
        />
      )}

      {showWishlist && (
        <Wishlist
          onMovieClick={(id, type) => {
            setShowWishlist(false);
            setSelectedContent({ id, type: type || contentType });
          }}
          onClose={() => setShowWishlist(false)}
        />
      )}

      {authUser && (
        <>
          <AIChatbot
            isOpen={chatbotOpen}
            onClose={() => setChatbotOpen(false)}
            onMovieClick={async (movie) => {
              await addToWishlist(movie);
              setChatbotOpen(false);
              setSelectedContent({ id: movie.id, type: 'movie' }); // Bot usually recommends movies
            }}
          />

          {!chatbotOpen && (
            <button
              className="chatbot-fab"
              onClick={() => setChatbotOpen(true)}
              title="Chat with MovieBot AI"
            >
              <img src="/logo.png" alt="MovieBot" className="chatbot-fab-logo" />
            </button>
          )}
        </>
      )}
    </main>
  )
}

export default App
