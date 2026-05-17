import { useEffect, useState } from 'react'
import {
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  getPlatformPreferences,
  togglePlatformPreference,
  hasPlatformPreference
} from '../utils/wishlist'

import { 
  saveWatchProgress, 
  getResumeTime 
} from '../utils/streaming'

const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  }
}

const MovieDetails = ({ movieId, onClose }) => {
  const [details, setDetails] = useState(null);
  const [credits, setCredits] = useState(null);
  const [videos, setVideos] = useState(null);
  const [watchProviders, setWatchProviders] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [userPlatforms, setUserPlatforms] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    if (movieId) {
      isInWishlist(movieId).then(val => setInWishlist(val));
      setUserPlatforms(getPlatformPreferences());
      setIsPlaying(false);
      setIsUnavailable(false);
    }

    const fetchMovieDetails = async () => {
      try {
        setIsLoading(true);

        // Fetch movie details, credits, and videos in parallel
        const [detailsRes, creditsRes, videosRes, providersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/movie/${movieId}?language=en-US`, API_OPTIONS),
          fetch(`${API_BASE_URL}/movie/${movieId}/credits?language=en-US`, API_OPTIONS),
          fetch(`${API_BASE_URL}/movie/${movieId}/videos?language=en-US`, API_OPTIONS),
          fetch(`${API_BASE_URL}/movie/${movieId}/watch/providers`, API_OPTIONS)
        ]);

        const detailsData = await detailsRes.json();
        const creditsData = await creditsRes.json();
        const videosData = await videosRes.json();
        const providersData = await providersRes.json();

        setDetails(detailsData);
        setCredits(creditsData);
        setVideos(videosData);
        setWatchProviders(providersData);
      } catch (error) {
        console.error('Error fetching movie details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (movieId) {
      fetchMovieDetails();
    }
  }, [movieId]);

  useEffect(() => {
    const handlePlayerMessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "PLAYER_EVENT") {
            // console.log("Vidking Player Event:", message.data);
            
            // Check for potential error or 'not found' signals
            if (message.data.event === "error" || message.data.event === "not_found") {
              setIsUnavailable(true);
            }

            // Save progress on timeupdate or other significant events
            if (["timeupdate", "pause", "ended"].includes(message.data.event)) {
              saveWatchProgress(movieId, message.data);
            }
          }
        } catch {
          // Not a JSON message or not from our player
        }
      }
    };

    window.addEventListener("message", handlePlayerMessage);
    return () => window.removeEventListener("message", handlePlayerMessage);
  }, [movieId]);

  if (!movieId) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };


  // Get watch providers for US (you can change to user's region)
  const providers = watchProviders?.results?.US;
  const streamingProviders = providers?.flatrate || [];
  const rentProviders = providers?.rent || [];
  const buyProviders = providers?.buy || [];

  const toggleWishlist = async () => {
    if (inWishlist) {
      await removeFromWishlist(movieId);
      setInWishlist(false);
    } else {
      await addToWishlist(details);
      setInWishlist(true);
    }
  };

  const handlePlatformToggle = (providerId, providerName, e) => {
    e.preventDefault();
    e.stopPropagation();
    togglePlatformPreference(providerId, providerName);
    setUserPlatforms(getPlatformPreferences());
  };

  // Find best deal (prioritize user's platforms)
  const getBestDeal = () => {
    const userPlatformIds = userPlatforms.map(p => p.id);

    // Check if available on user's platforms
    const userProvider = streamingProviders.find(p => userPlatformIds.includes(p.provider_id));
    if (userProvider) return { provider: userProvider, type: 'stream', isUserPlatform: true };

    // Otherwise, cheapest option
    if (streamingProviders.length > 0) return { provider: streamingProviders[0], type: 'stream', isUserPlatform: false };
    if (rentProviders.length > 0) return { provider: rentProviders[0], type: 'rent', isUserPlatform: false };
    if (buyProviders.length > 0) return { provider: buyProviders[0], type: 'buy', isUserPlatform: false };

    return null;
  };

  const bestDeal = getBestDeal();
  const trailer = videos?.results?.find(
    (video) => video.type === 'Trailer' && video.site === 'YouTube'
  );

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <button
          className={`wishlist-toggle-btn ${inWishlist ? 'in-wishlist' : ''}`}
          onClick={toggleWishlist}
          title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {inWishlist ? 'Remove from Favorites' : 'Add to Favorites'}
        </button>

        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-12 w-12 border-4 border-light-100 border-t-transparent rounded-full"></div>
          </div>
        ) : details ? (
          <div className="modal-body">
            <div className="modal-header">
              {isPlaying ? (
                <div className="streaming-container">
                  <button 
                    className="close-player-btn"
                    onClick={() => setIsPlaying(false)}
                    title="Close Player"
                  >
                    ×
                  </button>
                  {isUnavailable ? (
                    <div className="unavailable-message">
                      <div className="text-center p-8">
                        <span className="text-4xl mb-4 block">🎬</span>
                        <h3 className="text-xl font-bold mb-2">Movie Not Found</h3>
                        <p className="text-gray-300 mb-4">
                          This movie is not currently on our server, but we will add it soon!
                        </p>
                        <button 
                          className="bg-light-100/10 hover:bg-light-100/20 px-4 py-2 rounded-lg text-sm transition-all"
                          onClick={() => setIsPlaying(false)}
                        >
                          Go Back
                        </button>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      src={`https://www.vidking.net/embed/movie/${movieId}?color=AB8BFF&autoPlay=true&progress=${getResumeTime(movieId)}`}
                      title="Movie Player"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; fullscreen"
                      onError={() => setIsUnavailable(true)}
                    ></iframe>
                  )}
                </div>
              ) : (
                <>
                  {details.backdrop_path && (
                    <img
                      src={`https://image.tmdb.org/t/p/original${details.backdrop_path}`}
                      alt={details.title}
                      className="modal-backdrop-img"
                    />
                  )}
                  <div className="watch-now-overlay">
                    <button 
                      className="watch-now-btn"
                      onClick={() => setIsPlaying(true)}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Watch Now
                    </button>
                  </div>
                </>
              )}
              <div className="modal-header-content">
                <h2>{details.title}</h2>
                {details.tagline && <p className="tagline">{details.tagline}</p>}

                <div className="modal-meta">
                  <div className="rating">
                    <img src="/star.svg" alt="Rating" />
                    <span>{details.vote_average?.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{details.release_date?.split('-')[0]}</span>
                  <span>•</span>
                  <span>{details.runtime} min</span>
                </div>

                <div className="genres">
                  {details.genres?.map((genre) => (
                    <span key={genre.id} className="genre-tag">
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {(streamingProviders.length > 0 || rentProviders.length > 0 || buyProviders.length > 0) && (
              <section>
                <h3>Where to Watch</h3>

                {bestDeal && (
                  <div className="best-deal-banner">
                    <span className="best-deal-badge">🏆 Best Deal</span>
                    <div className="best-deal-content">
                      <img
                        src={`https://image.tmdb.org/t/p/original${bestDeal.provider.logo_path}`}
                        alt={bestDeal.provider.provider_name}
                        className="best-deal-logo"
                      />
                      <div>
                        <p className="best-deal-name">{bestDeal.provider.provider_name}</p>
                        <p className="best-deal-type">
                          {bestDeal.isUserPlatform
                            ? '✨ Available on your platform'
                            : `${bestDeal.type.charAt(0).toUpperCase() + bestDeal.type.slice(1)} available`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {streamingProviders.length > 0 && (
                  <div className="watch-section">
                    <h4 className="watch-type">Stream</h4>
                    <div className="providers-grid">
                      {streamingProviders.map((provider) => (
                        <div key={provider.provider_id} className="provider-card-wrapper">
                          <a
                            href={providers.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`provider-card ${hasPlatformPreference(provider.provider_id) ? 'user-platform' : ''}`}
                            title={provider.provider_name}
                          >
                            {hasPlatformPreference(provider.provider_id) && (
                              <span className="user-platform-badge">✓</span>
                            )}
                            <img
                              src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                              alt={provider.provider_name}
                            />
                            <span>{provider.provider_name}</span>
                            <span className="free-badge">Included</span>
                          </a>
                          <button
                            className="platform-preference-btn"
                            onClick={(e) => handlePlatformToggle(provider.provider_id, provider.provider_name, e)}
                            title={hasPlatformPreference(provider.provider_id) ? 'Remove from my platforms' : 'Add to my platforms'}
                          >
                            {hasPlatformPreference(provider.provider_id) ? '⭐' : '☆'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rentProviders.length > 0 && (
                  <div className="watch-section">
                    <h4 className="watch-type">Rent</h4>
                    <div className="providers-grid">
                      {rentProviders.map((provider) => (
                        <div key={provider.provider_id} className="provider-card-wrapper">
                          <a
                            href={providers.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="provider-card"
                            title={provider.provider_name}
                          >
                            <img
                              src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                              alt={provider.provider_name}
                            />
                            <span>{provider.provider_name}</span>
                            <span className="rent-badge">Rental</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {buyProviders.length > 0 && (
                  <div className="watch-section">
                    <h4 className="watch-type">Buy</h4>
                    <div className="providers-grid">
                      {buyProviders.map((provider) => (
                        <div key={provider.provider_id} className="provider-card-wrapper">
                          <a
                            href={providers.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="provider-card"
                            title={provider.provider_name}
                          >
                            <img
                              src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                              alt={provider.provider_name}
                            />
                            <span>{provider.provider_name}</span>
                            <span className="buy-badge">Purchase</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="provider-note">
                  Availability may vary by region. Powered by JustWatch.
                </p>
              </section>
            )}

            <div className="modal-sections">
              <section>
                <h3>Overview</h3>
                <p className="overview">{details.overview}</p>
              </section>

              {trailer && (
                <section>
                  <h3>Trailer</h3>
                  <div className="trailer-container">
                    <iframe
                      src={`https://www.youtube.com/embed/${trailer.key}`}
                      title="Movie Trailer"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </section>
              )}

              {credits?.cast && credits.cast.length > 0 && (
                <section>
                  <h3>Cast</h3>
                  <div className="cast-grid">
                    {credits.cast.slice(0, 6).map((actor) => (
                      <div key={actor.id} className="cast-member">
                        {actor.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                            alt={actor.name}
                          />
                        ) : (
                          <div className="no-image">No Image</div>
                        )}
                        <p className="actor-name">{actor.name}</p>
                        <p className="character-name">{actor.character}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="additional-info">
                <div>
                  <h4>Budget</h4>
                  <p>{details.budget ? `$${details.budget.toLocaleString()}` : 'N/A'}</p>
                </div>
                <div>
                  <h4>Revenue</h4>
                  <p>{details.revenue ? `$${details.revenue.toLocaleString()}` : 'N/A'}</p>
                </div>
                <div>
                  <h4>Status</h4>
                  <p>{details.status}</p>
                </div>
                <div>
                  <h4>Original Language</h4>
                  <p>{details.original_language?.toUpperCase()}</p>
                </div>
              </section>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-200">Failed to load movie details</p>
        )}
      </div>
    </div>
  );
};

export default MovieDetails;
