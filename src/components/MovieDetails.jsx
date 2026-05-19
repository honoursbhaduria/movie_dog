import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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

const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  }
}

const MovieDetails = () => {
  const { id: movieId, type: contentType } = useParams();
  const navigate = useNavigate();
  
  const [details, setDetails] = useState(null);
  const [credits, setCredits] = useState(null);
  const [videos, setVideos] = useState(null);
  const [watchProviders, setWatchProviders] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  // Player enhancements state
  const [isPaused, setIsPaused] = useState(false);
  const [showLandingScreen, setShowLandingScreen] = useState(false);
  const landingTimerRef = useRef(null);
  const playerRef = useRef(null);

  // TV specific state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const isStreamingUnlocked = localStorage.getItem('streaming_unlocked') === 'true';

  useEffect(() => {
    if (movieId) {
      isInWishlist(movieId).then(val => setInWishlist(val));
      setIsPlaying(false);
      setIsUnavailable(false);
    }

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const type = contentType === 'tv' ? 'tv' : 'movie';
        
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
        
        // Reset selected episode to 1 when season changes, 
        // but only if we're not currently playing or if it's a fresh season load
        setSelectedEpisode(1);
      } catch (error) {
        console.error('Error fetching episodes:', error);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    fetchEpisodes();
  }, [movieId, contentType, selectedSeason]);

  // Pause Landing Screen logic
  useEffect(() => {
    if (isPaused) {
      landingTimerRef.current = setTimeout(() => {
        setShowLandingScreen(true);
      }, 12000); // 12 seconds delay
    } else {
      if (landingTimerRef.current) clearTimeout(landingTimerRef.current);
      setShowLandingScreen(false);
    }

    return () => {
      if (landingTimerRef.current) clearTimeout(landingTimerRef.current);
    };
  }, [isPaused]);

  useEffect(() => {
    const handlePlayerMessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "PLAYER_EVENT") {
            const { event: evt, data } = message.data;
            
            if (evt === "error" || evt === "not_found") {
              setIsUnavailable(true);
            }
            
            if (evt === "pause") {
              setIsPaused(true);
            }
            
            if (evt === "play") {
              setIsPaused(false);
              setShowLandingScreen(false);
            }

            if (["timeupdate", "pause", "ended"].includes(evt)) {
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-primary"><Spinner /></div>;
  if (!details) return <div className="min-h-screen flex items-center justify-center bg-primary text-white">Content not found.</div>;

  const toggleWishlist = async () => {
    if (inWishlist) {
      await removeFromWishlist(movieId);
      setInWishlist(false);
    } else {
      await addToWishlist(details);
      setInWishlist(true);
    }
  };

  const handleSkip = (seconds) => {
    if (playerRef.current) {
      playerRef.current.contentWindow.postMessage(JSON.stringify({
        type: 'PLAYER_COMMAND',
        data: { command: 'seek', value: seconds }
      }), '*');
    }
  };

  const providers = watchProviders?.results?.IN || watchProviders?.results?.US || Object.values(watchProviders?.results || {})[0];
  const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  
  const embedUrl = contentType === 'tv' 
    ? `https://www.vidking.net/embed/tv/${movieId}/${selectedSeason}/${selectedEpisode}?color=AB8BFF&autoPlay=true`
    : `https://www.vidking.net/embed/movie/${movieId}?color=AB8BFF&autoPlay=true&progress=${getResumeTime(movieId)}`;

  const title = details.title || details.name;

  return (
    <div className="details-page bg-primary min-h-screen text-white">
      {/* ── Navbar ── */}
      <nav className="details-nav flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-light-200 hover:text-white transition-all">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8" />
          <span className="font-bold text-lg hidden sm:inline">MovieDog</span>
        </Link>
        <button 
          onClick={toggleWishlist} 
          className={`px-4 py-1.5 rounded-lg font-semibold text-sm transition-all ${inWishlist ? 'bg-red-500/20 text-red-400' : 'bg-light-100/10 text-white'}`}
        >
          {inWishlist ? 'Saved' : 'Save to Wishlist'}
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* ── Player Section ── */}
        {isStreamingUnlocked && (
          <div className="player-section mb-12">
            <div className="player-wrapper relative aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5">
              {isPlaying ? (
                <>
                  {isUnavailable ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-100 text-white z-40 p-6 text-center">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 mb-4 opacity-50"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <p className="text-2xl font-black mb-2 uppercase tracking-tight">Content Unavailable</p>
                      <p className="text-gray-400 mb-6">This title cannot be played at the moment. Please try again later or check other sources.</p>
                      <button onClick={() => setIsUnavailable(false)} className="px-8 py-3 bg-white text-primary font-black rounded-full hover:scale-105 transition-transform">TRY AGAIN</button>
                    </div>
                  ) : (
                    <iframe
                      ref={playerRef}
                      key={`${selectedSeason}-${selectedEpisode}`}
                      src={embedUrl}
                      title="Content Player"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; fullscreen"
                      className="w-full h-full"
                      onError={() => setIsUnavailable(true)}
                    ></iframe>
                  )}

                  {/* Landing Screen (appears after 12s pause) */}
                  {showLandingScreen && (
                    <div className="player-landing-screen absolute inset-0 flex items-center justify-center bg-black/95 z-30 animate-fadeIn pointer-events-auto">
                      <div className="text-center p-8">
                        <h2 className="text-4xl sm:text-7xl font-black text-gradient mb-4 uppercase tracking-tighter">{title}</h2>
                        <p className="text-light-200 text-lg sm:text-2xl font-medium">Pause Mode Active</p>
                        <button 
                          onClick={() => {
                            setIsPaused(false);
                            setShowLandingScreen(false);
                          }}
                          className="mt-10 px-10 py-4 bg-white text-primary font-black rounded-full hover:scale-105 transition-transform shadow-xl"
                        >
                          RESUME WATCHING
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Custom Skip Overlays */}
                  {!isUnavailable && (
                    <div className="player-controls-overlay absolute inset-0 pointer-events-none z-20">
                       <button 
                          onClick={() => handleSkip(-10)}
                          className="skip-btn pointer-events-auto absolute left-[12%] top-1/2 -translate-y-1/2"
                          title="Skip backward 10s"
                       >
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>
                          <span>10s</span>
                       </button>
                       <button 
                          onClick={() => handleSkip(10)}
                          className="skip-btn pointer-events-auto absolute right-[12%] top-1/2 -translate-y-1/2"
                          title="Skip forward 10s"
                       >
                          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                          <span>10s</span>
                       </button>
                    </div>
                  )}
                </>
              ) : (
                <div 
                  className="player-placeholder w-full h-full relative cursor-pointer group"
                  onClick={() => setIsPlaying(true)}
                >
                  <img src={`https://image.tmdb.org/t/p/original${details.backdrop_path}`} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Content Info ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <header className="space-y-6">
              <h1 className="text-4xl sm:text-6xl font-black text-left leading-[1.1] tracking-tight">{title}</h1>
              {details.tagline && <p className="text-2xl text-light-200 italic font-medium">"{details.tagline}"</p>}
              
              <div className="flex flex-wrap items-center gap-6 text-sm sm:text-lg text-gray-300">
                <div className="flex items-center gap-2 bg-yellow-400/10 text-yellow-400 px-4 py-1.5 rounded-full font-black border border-yellow-400/20">
                  <img src="/star.svg" className="w-5 h-5" alt="" />
                  {details.vote_average?.toFixed(1)}
                </div>
                <span className="font-bold">{details.release_date?.split('-')[0] || details.first_air_date?.split('-')[0]}</span>
                <span className="opacity-60">{details.runtime || details.episode_run_time?.[0]} min</span>
                <div className="flex gap-2">
                  {details.genres?.slice(0, 3).map(g => (
                    <span key={g.id} className="text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10 px-4 py-1.5 rounded-full">{g.name}</span>
                  ))}
                </div>
              </div>
            </header>

            <section className="space-y-4">
              <h3 className="text-2xl font-black uppercase tracking-tight text-gradient">Overview</h3>
              <p className="text-gray-300 text-xl leading-relaxed font-medium">{details.overview}</p>
            </section>

            {/* ── Reaction Section ── */}
            <section className="reaction-section bg-white/5 rounded-[40px] p-8 sm:p-12 border border-white/5">
              <h3 className="text-2xl font-black mb-8 uppercase tracking-tight">Reactions</h3>
              <div className="space-y-8">
                <div className="flex gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 shrink-0 shadow-lg" />
                  <div className="flex-1">
                    <textarea 
                      placeholder="Share your thoughts..." 
                      className="w-full bg-black/40 border border-white/10 rounded-3xl px-6 py-5 text-lg focus:border-primary outline-none min-h-[150px] resize-none transition-all placeholder:text-gray-600"
                    />
                    <div className="flex justify-end mt-4">
                      <button className="bg-primary hover:bg-primary/80 px-10 py-3 rounded-2xl text-lg font-black transition-all shadow-lg hover:scale-[1.02]">POST REACTION</button>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p className="text-xl font-bold opacity-30 uppercase tracking-widest">No reactions yet</p>
                </div>
              </div>
            </section>
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-12">
            {contentType === 'tv' && isStreamingUnlocked && (
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xl uppercase tracking-tight">Episodes</h3>
                  <select 
                    value={selectedSeason} 
                    onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-primary"
                  >
                    {details.seasons?.filter(s => s.season_number > 0).map(s => (
                      <option key={s.id} value={s.season_number} className="bg-dark-100">Season {s.season_number}</option>
                    ))}
                  </select>
                </div>
                <div className="max-h-[700px] overflow-y-auto space-y-4 pr-3 hide-scrollbar">
                  {episodes.map(ep => (
                    <button 
                      key={ep.id}
                      onClick={() => {
                        setSelectedEpisode(ep.episode_number);
                        setIsPlaying(true);
                      }}
                      className={`flex gap-4 w-full text-left p-3 rounded-[24px] transition-all border-2 ${selectedEpisode === ep.episode_number ? 'bg-primary border-primary shadow-xl scale-[1.02]' : 'bg-white/5 border-transparent hover:border-white/10'}`}
                    >
                      <div className="w-32 aspect-video rounded-2xl overflow-hidden shrink-0 shadow-lg">
                        <img src={ep.still_path ? `https://image.tmdb.org/t/p/w200${ep.still_path}` : details.backdrop_path ? `https://image.tmdb.org/t/p/w200${details.backdrop_path}` : '/no-movie.png'} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <p className="text-xs font-black text-primary uppercase tracking-widest mb-1">EP {ep.episode_number}</p>
                        <p className="text-base font-black truncate">{ep.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {providers && (
              <section className="space-y-6">
                <h3 className="font-black text-xl uppercase tracking-tight">Where to Watch</h3>
                <div className="flex flex-wrap gap-4">
                  {providers.flatrate?.map(p => (
                    <div key={p.provider_id} title={p.provider_name} className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/10 hover:border-primary transition-all cursor-pointer shadow-lg">
                      <img src={`https://image.tmdb.org/t/p/original${p.logo_path}`} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-6">
              <h3 className="font-black text-xl uppercase tracking-tight">Top Cast</h3>
              <div className="grid grid-cols-3 gap-4">
                {credits?.cast?.slice(0, 6).map(c => (
                  <div key={c.id} className="text-center group cursor-pointer">
                    <div className="aspect-square rounded-3xl overflow-hidden mb-2 border-2 border-white/5 group-hover:border-primary transition-all shadow-lg">
                      <img src={c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '/no-movie.png'} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="" />
                    </div>
                    <p className="text-[11px] font-black line-clamp-1 uppercase tracking-tight">{c.name}</p>
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
