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

const MovieDetails = ({ movieId, contentType = 'movie', onClose }) => {
  const [details, setDetails] = useState(null);
  const [credits, setCredits] = useState(null);
  const [videos, setVideos] = useState(null);
  const [watchProviders, setWatchProviders] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [userPlatforms, setUserPlatforms] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  // TV specific state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    if (movieId) {
      isInWishlist(movieId).then(val => setInWishlist(val));
      setUserPlatforms(getPlatformPreferences());
      setIsPlaying(false);
      setIsUnavailable(false);
    }

    const fetchDetails = async () => {
      try {
        setIsLoading(true);

        const type = contentType === 'tv' ? 'tv' : 'movie';
        
        // Fetch details, credits, and videos in parallel
        const [detailsRes, creditsRes, videosRes, providersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/${type}/${movieId}?language=en-US`, API_OPTIONS),
          fetch(`${API_BASE_URL}/${type}/${movieId}/credits?language=en-US`, API_OPTIONS),
          fetch(`${API_BASE_URL}/${type}/${movieId}/videos?language=en-US`, API_OPTIONS),
          fetch(`${API_BASE_URL}/${type}/${movieId}/watch/providers`, API_OPTIONS)
        ]);

        const detailsData = await detailsRes.json();
        const creditsData = await creditsRes.json();
        const videosData = await videosRes.json();
        const providersData = await providersRes.json();

        setDetails(detailsData);
        setCredits(creditsData);
        setVideos(videosData);
        setWatchProviders(providersData);

        if (contentType === 'tv' && detailsData.seasons?.length > 0) {
          const firstSeason = detailsData.seasons.find(s => s.season_number > 0) || detailsData.seasons[0];
          setSelectedSeason(firstSeason.season_number);
        }
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
        const res = await fetch(`${API_BASE_URL}/tv/${movieId}/season/${selectedSeason}?language=en-US`, API_OPTIONS);
        const data = await res.json();
        setEpisodes(data.episodes || []);
      } catch (error) {
        console.error('Error fetching episodes:', error);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    fetchEpisodes();
  }, [movieId, contentType, selectedSeason]);

  useEffect(() => {
    const handlePlayerMessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "PLAYER_EVENT") {
            if (message.data.event === "error" || message.data.event === "not_found") {
              setIsUnavailable(true);
            }
            if (["timeupdate", "pause", "ended"].includes(message.data.event)) {
              saveWatchProgress(movieId, message.data);
            }
          }
        } catch {
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

  const providers = watchProviders?.results?.US;
  const streamingProviders = providers?.flatrate || [];

  const toggleWishlist = async () => {
    if (inWishlist) {
      await removeFromWishlist(movieId);
      setInWishlist(false);
    } else {
      await addToWishlist(details);
      setInWishlist(true);
    }
  };

  const bestDeal = () => {
    const userPlatformIds = userPlatforms.map(p => p.id);
    const userProvider = streamingProviders.find(p => userPlatformIds.includes(p.provider_id));
    if (userProvider) return { provider: userProvider, type: 'stream', isUserPlatform: true };
    if (streamingProviders.length > 0) return { provider: streamingProviders[0], type: 'stream', isUserPlatform: false };
    return null;
  };

  const currentBestDeal = bestDeal();
  const trailer = videos?.results?.find(
    (video) => video.type === 'Trailer' && video.site === 'YouTube'
  );

  const embedUrl = contentType === 'tv' 
    ? `https://www.vidking.net/embed/tv/${movieId}/${selectedSeason}/${selectedEpisode}?color=AB8BFF&autoPlay=true`
    : `https://www.vidking.net/embed/movie/${movieId}?color=AB8BFF&autoPlay=true&progress=${getResumeTime(movieId)}`;

  const title = details?.title || details?.name;
  const releaseDate = details?.release_date || details?.first_air_date;
  const runtime = details?.runtime || (details?.episode_run_time?.[0]);

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <button
          className={`wishlist-toggle-btn ${inWishlist ? 'in-wishlist' : ''}`}
          onClick={toggleWishlist}
          title={inWishlist ? 'Remove from favorites' : 'Add to favorites'}
        >
          {inWishlist ? 'Saved' : 'Save'}
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
                        <h3 className="text-xl font-bold mb-2">{contentType === 'movie' ? 'Movie' : 'Web Series'} Not Found</h3>
                        <p className="text-gray-300 mb-4">
                          This content is not currently available on our server.
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
                      src={embedUrl}
                      title="Content Player"
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
                      alt={title}
                      className="modal-backdrop-img"
                    />
                  )}
                </>
              )}
              <div className="modal-header-content">
                <h2>{title}</h2>
                {details.tagline && <p className="tagline">{details.tagline}</p>}

                <div className="modal-meta">
                  <div className="rating">
                    <img src="/star.svg" alt="Rating" />
                    <span>{details.vote_average?.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{releaseDate?.split('-')[0]}</span>
                  {runtime && (
                    <>
                      <span>•</span>
                      <span>{runtime} min{contentType === 'tv' ? ' / ep' : ''}</span>
                    </>
                  )}
                  {contentType === 'tv' && (
                    <>
                      <span>•</span>
                      <span>{details.number_of_seasons} Seasons</span>
                    </>
                  )}
                </div>

                <div className="genres">
                  {details.genres?.map((genre) => (
                    <span key={genre.id} className="genre-tag">
                      {genre.name}
                    </span>
                  ))}
                </div>

                {!isPlaying && (
                  <button className="watch-main-btn" onClick={() => setIsPlaying(true)}>
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    {contentType === 'movie' ? 'Watch Now' : `Play S${selectedSeason}:E${selectedEpisode}`}
                  </button>
                )}
              </div>
            </div>

            <div className="modal-sections">
              {contentType === 'tv' && (
                <section className="episodes-section">
                  <div className="episodes-header">
                    <h3>Episodes</h3>
                    <div className="season-selector">
                      {details.seasons?.filter(s => s.season_number > 0).map(season => (
                        <button
                          key={season.id}
                          className={`season-tab ${selectedSeason === season.season_number ? 'active' : ''}`}
                          onClick={() => setSelectedSeason(season.season_number)}
                        >
                          S{season.season_number}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loadingEpisodes ? (
                    <div className="flex justify-center py-10">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : (
                    <div className="episodes-grid">
                      {episodes.map(episode => (
                        <div 
                          key={episode.id} 
                          className={`episode-card ${selectedEpisode === episode.episode_number ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedEpisode(episode.episode_number);
                            setIsPlaying(true);
                          }}
                        >
                          <div className="episode-thumb">
                            <img 
                              src={episode.still_path 
                                ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
                                : details.backdrop_path ? `https://image.tmdb.org/t/p/w300${details.backdrop_path}` : '/no-movie.png'
                              } 
                              alt={episode.name} 
                            />
                            <div className="play-overlay">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                          <div className="episode-info">
                            <p className="ep-number">Episode {episode.episode_number}</p>
                            <p className="ep-title">{episode.name}</p>
                            {episode.overview && <p className="ep-overview">{episode.overview}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

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
                      title="Trailer"
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
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-200">Failed to load details</p>
        )}
      </div>
    </div>
  );
};

export default MovieDetails;
