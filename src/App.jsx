import { useEffect, useState } from 'react'
import Search from './components/Search.jsx'
import Spinner from './components/Spinner.jsx'
import MovieCard from './components/MovieCard.jsx'
import MovieDetails from './components/MovieDetails.jsx'
import Wishlist from './components/Wishlist.jsx'
import { useDebounce } from 'react-use'
import { getTrendingMovies, updateSearchCount } from './supabase.js'

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

  const [movieList, setMovieList] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  const [trendingMovies, setTrendingMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showWishlist, setShowWishlist] = useState(false);

  // Debounce the search term to prevent making too many API requests
  // by waiting for the user to stop typing for 500ms
  useDebounce(() => setDebouncedSearchTerm(searchTerm), 500, [searchTerm])

  const fetchMovies = async (query = '', page = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setMovieList([]);
    }
    setErrorMessage('');

    try {
      const endpoint = query
        ? `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}`
        : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc&page=${page}`;

      const response = await fetch(endpoint, API_OPTIONS);

      if(!response.ok) {
        throw new Error('Failed to fetch movies');
      }

      const data = await response.json();

      if(data.Response === 'False') {
        setErrorMessage(data.Error || 'Failed to fetch movies');
        setMovieList([]);
        return;
      }

      const newMovies = data.results || [];
      
      if (append) {
        setMovieList(prev => [...prev, ...newMovies]);
      } else {
        setMovieList(newMovies);
      }

      setCurrentPage(data.page || page);
      setTotalPages(Math.min(data.total_pages || 0, 500)); // API limits to 500 pages
      setTotalResults(data.total_results || 0);

      if(query && newMovies.length > 0) {
        await updateSearchCount(query, newMovies[0]);
      }
    } catch (error) {
      console.error(`Error fetching movies: ${error}`);
      setErrorMessage('Error fetching movies. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  const loadMoreMovies = () => {
    if (currentPage < totalPages) {
      fetchMovies(debouncedSearchTerm, currentPage + 1, true);
    }
  }

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies();

      // If supabase isn't configured or returned no results, fall back
      // to TMDb's trending endpoint so the UI still shows trending items.
      if (!movies || movies.length === 0) {
        try {
          const resp = await fetch(`${API_BASE_URL}/trending/movie/day`, API_OPTIONS);
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
      console.error(`Error fetching trending movies: ${error}`);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
    fetchMovies(debouncedSearchTerm, 1, false);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    loadTrendingMovies();
  }, []);

  return (
    <main>
      <div className="pattern"/>

      <div className="wrapper">
        <header>
          <div className="header-actions">
            <button 
              className="wishlist-btn"
              onClick={() => setShowWishlist(true)}
              title="View Wishlist"
            >
              My Favorites
            </button>
          </div>
          
          <img src="./hero.png" alt="Hero Banner" />
          <h1>Find <span className="text-gradient">Movies</span> You'll Enjoy Without the Hassle</h1>

          <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </header>

        {trendingMovies.length > 0 && (
          <section className="trending">
            <h2>Trending Movies</h2>

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

        <section className="all-movies">
          <h2>All Movies</h2>
          {totalResults > 0 && (
            <p className="text-gray-200 text-sm mb-4">
              Showing {movieList.length} of {totalResults.toLocaleString()} movies
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
                    onClick={() => setSelectedMovie(movie.id)}
                  />
                ))}
              </ul>
              
              {currentPage < totalPages && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={loadMoreMovies}
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

      {selectedMovie && (
        <MovieDetails 
          movieId={selectedMovie} 
          onClose={() => setSelectedMovie(null)} 
        />
      )}

      {showWishlist && (
        <Wishlist
          onMovieClick={(id) => {
            setShowWishlist(false);
            setSelectedMovie(id);
          }}
          onClose={() => setShowWishlist(false)}
        />
      )}
    </main>
  )
}

export default App



 