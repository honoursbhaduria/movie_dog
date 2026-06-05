import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchWithCache } from '../utils/cache'
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

  // TV specific state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  const isStreamingUnlocked = localStorage.getItem('streaming_unlocked') === 'true';

  useEffect(() => {
    if (movieId) {
      isInWishlist(movieId).then(val => setInWishlist(val));
    }

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const type = contentType === 'tv' ? 'tv' : 'movie';

        const [detailsData, creditsData, videosData, providersData] = await Promise.all([
          fetchWithCache(`${API_BASE_URL}/${type}/${movieId}?language=en-US`, API_OPTIONS),
          fetchWithCache(`${API_BASE_URL}/${type}/${movieId}/credits?language=en-US`, API_OPTIONS),
          fetchWithCache(`${API_BASE_URL}/${type}/${movieId}/videos?language=en-US`, API_OPTIONS),
          fetchWithCache(`${API_BASE_URL}/${type}/${movieId}/watch/providers`, API_OPTIONS)
        ]);

        setDetails(detailsData);
        setCredits(creditsData);
        setVideos(videosData);
        setWatchProviders(providersData);

        if (contentType === 'tv' && detailsData.seasons?.length > 0) {
          const firstSeason = detailsData.seasons.find(s => s.season_number > 0) || detailsData.seasons[0];
          setSelectedSeason(firstSeason.season_number);
        }
      } catch (error) {
        const isNetworkError = error instanceof TypeError || (error.message && (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')));
        if (isNetworkError) {
          console.warn('Details fetch blocked by network or adblocker.');
        } else {
          console.error('Error fetching details:', error);
        }
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
        const data = await fetchWithCache(`${API_BASE_URL}/tv/${movieId}/season/${selectedSeason}?language=en-US`, API_OPTIONS);
        setEpisodes(data.episodes || []);
      } catch (error) {
        const isNetworkError = error instanceof TypeError || (error.message && (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')));
        if (!isNetworkError) {
          console.error('Error fetching episodes:', error);
        }
      } finally {
        setLoadingEpisodes(false);
      }
    };

    fetchEpisodes();
  }, [movieId, contentType, selectedSeason]);

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

  const providers = watchProviders?.results?.IN || watchProviders?.results?.US || Object.values(watchProviders?.results || {})[0];
  const trailer = videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  
  const title = details.title || details.name;

  const handleWatchNow = () => {
    if (contentType === 'tv') {
      navigate(`/player/tv/${movieId}/${selectedSeason}/1`);
    } else {
      navigate(`/player/movie/${movieId}`);
    }
  };

  return (
    <div className="details-page bg-primary min-h-screen text-white">
      {/* ── Navbar ── */}
      <nav className="details-nav flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5 backdrop-blur-xl sticky top-0 z-[100]">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-all text-sm font-bold shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          <span className="hidden xs:inline">Back</span>
        </button>
        
        <Link to="/" className="flex items-center gap-2 xs:absolute xs:left-1/2 xs:-translate-x-1/2">
          <img src="/logo.png" alt="Logo" className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className="font-black text-lg sm:text-xl tracking-tighter">MovieDog</span>
        </Link>

        <button 
          onClick={toggleWishlist} 
          className={`px-3 sm:px-5 py-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all shrink-0 ${inWishlist ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}
        >
          {inWishlist ? (
            <>
              <span className="xs:hidden">Saved</span>
              <span className="hidden xs:inline">Saved to Wishlist</span>
            </>
          ) : (
            <>
              <span className="xs:hidden">Save</span>
              <span className="hidden xs:inline">Save to Wishlist</span>
            </>
          )}
        </button>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* ── Hero Section ── */}
        <div className="relative h-[300px] xs:h-[450px] sm:h-[650px] rounded-[24px] sm:rounded-[48px] overflow-hidden mb-8 sm:mb-16 group shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
           <img src={`https://image.tmdb.org/t/p/original${details.backdrop_path || details.poster_path}`} className="w-full h-full object-cover opacity-60" alt="" />
           <div className="absolute inset-0 bg-gradient-to-t from-[#030014] via-transparent to-transparent" />
           
           <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              {isStreamingUnlocked && (
                <button 
                  onClick={handleWatchNow}
                  className="w-16 h-16 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center shrink-0 aspect-square hover:scale-110 transition-all duration-500 mb-4 sm:mb-8 border border-white/20 group/play p-0"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="ml-1 sm:ml-1.5 sm:w-8 sm:h-8"><path d="M8 5v14l11-7z"/></svg>
                </button>
              )}
              
              <h2 className="text-3xl xs:text-5xl sm:text-8xl font-black uppercase tracking-tighter mb-6 sm:mb-10 max-w-5xl px-2 sm:px-6 drop-shadow-2xl line-clamp-2">{title}</h2>
              
              <div className="flex flex-col xs:flex-row items-center gap-3 sm:gap-6">
                 {isStreamingUnlocked && (
                   <button onClick={handleWatchNow} className="w-full xs:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-white text-black font-black rounded-full hover:scale-105 transition-all uppercase tracking-widest text-[10px] sm:text-xs shadow-xl">Watch Now</button>
                 )}
                 {trailer && (
                   <a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" rel="noreferrer" className="w-full xs:w-auto px-8 sm:px-10 py-3 sm:py-4 bg-white/5 backdrop-blur-md text-white font-black rounded-full hover:bg-white/10 transition-all border border-white/20 uppercase tracking-widest text-[10px] sm:text-xs text-center">Trailer</a>
                 )}
              </div>
           </div>
        </div>

        {/* ── Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-8 space-y-10 sm:space-y-16">
            <header className="space-y-6 sm:space-y-8 text-left">
              <h1 className="text-4xl xs:text-6xl sm:text-8xl font-black leading-[0.9] tracking-tighter m-0 text-left">{title}</h1>
              {details.tagline && <p className="text-lg xs:text-2xl sm:text-3xl text-gray-400 italic font-medium tracking-tight">"{details.tagline}"</p>}
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-black uppercase tracking-widest">
                <div className="flex items-center gap-2 bg-yellow-400 text-black px-3 sm:px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                  <img src="/star.svg" className="w-3 h-3 sm:w-4 sm:h-4 invert" alt="" />
                  {details.vote_average?.toFixed(1)}
                </div>
                <span className="text-gray-300 ml-1 sm:ml-2">{details.release_date?.split('-')[0] || details.first_air_date?.split('-')[0]}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300">{details.runtime || details.episode_run_time?.[0]} min</span>
                <div className="flex flex-wrap gap-2 sm:ml-4">
                  {details.genres?.slice(0, 3).map(g => (
                    <span key={g.id} className="bg-white/5 border border-white/10 px-3 sm:px-4 py-1.5 rounded-full text-gray-400">{g.name}</span>
                  ))}
                </div>
              </div>
            </header>

            <section className="space-y-4 sm:space-y-6">
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-white/50">Overview</h3>
              <p className="text-gray-300 text-lg sm:text-2xl leading-relaxed font-medium tracking-tight">{details.overview}</p>
            </section>
          </div>

          {/* ── Sidebar ── */}
          <aside className="lg:col-span-4 space-y-12 sm:space-y-20">
            {contentType === 'tv' && isStreamingUnlocked && (
              <section className="space-y-6 sm:space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-lg sm:text-xl uppercase tracking-widest text-white/50">Episodes</h3>
                  <select 
                    value={selectedSeason} 
                    onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold outline-none focus:border-primary cursor-pointer hover:bg-white/10 transition-all"
                  >
                    {details.seasons?.filter(s => s.season_number > 0).map(s => (
                      <option key={s.id} value={s.season_number} className="bg-dark-100">Season {s.season_number}</option>
                    ))}
                  </select>
                </div>
                <div className="max-h-[500px] sm:max-h-[800px] overflow-y-auto space-y-4 sm:space-y-6 pr-2 sm:pr-4 custom-scrollbar">
                  {episodes.map(ep => (
                    <button 
                      key={ep.id}
                      onClick={() => navigate(`/player/tv/${movieId}/${selectedSeason}/${ep.episode_number}`)}
                      className="flex gap-4 sm:gap-5 w-full text-left group bg-white/5 p-3 rounded-[24px] border border-transparent hover:border-primary/50 hover:bg-white/10 transition-all"
                    >
                      <div className="w-28 sm:w-36 aspect-video rounded-[16px] sm:rounded-[20px] overflow-hidden shrink-0 shadow-xl border border-white/5 relative">
                        <img src={ep.still_path ? `https://image.tmdb.org/t/p/w200${ep.still_path}` : details.backdrop_path ? `https://image.tmdb.org/t/p/w200${details.backdrop_path}` : '/no-movie.png'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                           <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="ml-0.5"><path d="M8 5v14l11-7z"/></svg>
                           </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 py-0.5 sm:py-1 flex flex-col justify-center">
                        <p className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1 sm:mb-1.5">EP {ep.episode_number}</p>
                        <p className="text-sm sm:text-base font-black text-gray-200 line-clamp-1 group-hover:text-white transition-colors">{ep.name}</p>
                        <p className="text-[10px] text-gray-500 mt-1 line-clamp-1 hidden sm:block">{ep.overview || 'No description available.'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {providers && (
              <section className="space-y-6 sm:space-y-8">
                <h3 className="font-black text-lg sm:text-xl uppercase tracking-widest text-white/50">Where to Watch</h3>
                <div className="flex flex-wrap gap-4 sm:gap-5">
                  {providers.flatrate?.map(p => (
                    <div key={p.provider_id} title={p.provider_name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-[16px] sm:rounded-[24px] overflow-hidden border border-white/10 hover:border-primary transition-all cursor-pointer shadow-xl scale-100 hover:scale-110">
                      <img src={`https://image.tmdb.org/t/p/original${p.logo_path}`} className="w-full h-full object-cover" alt="" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-8 sm:space-y-10">
              <h3 className="font-black text-lg sm:text-xl uppercase tracking-widest text-white/50">Top Cast</h3>
              <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-3 gap-4 sm:gap-8">
                {credits?.cast?.slice(0, 6).map(c => (
                  <div key={c.id} className="text-center group cursor-pointer">
                    <div className="aspect-square rounded-[24px] sm:rounded-[32px] overflow-hidden mb-2 sm:mb-4 border-2 border-transparent group-hover:border-primary transition-all shadow-2xl">
                      <img src={c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : '/no-movie.png'} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-100 group-hover:scale-110" alt="" />
                    </div>
                    <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-widest line-clamp-1 group-hover:text-white transition-colors">{c.name}</p>
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
