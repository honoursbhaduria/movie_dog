import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { saveWatchProgress, getResumeTime } from '../utils/streaming'
import Spinner from './Spinner'
import { tmdbFetch } from '../utils/tmdb'

// ─── Allowed origins for postMessage ────────────────────────────────────────
const TRUSTED_ORIGINS = [
  'https://www.2embed.cc',
  'https://vidsrc.to',
  'https://vidsrc.me',
  'https://vidsrc.xyz',
  'https://www.vidking.net',
  'https://vidsrc.pro',
];

// ─── Server list ─────────────────────────────────────────────────────────────
const SERVERS = [
  {
    id: 'twoembed',
    name: 'S1',
    url: (type, id, s, e, mode) =>
      type === 'tv'
        ? `https://www.2embed.cc/embedtv/${id}?s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${id}`,
  },
  {
    id: 'vidsrc_to',
    name: 'S2',
    url: (type, id, s, e, mode) =>
      type === 'tv'
        ? `https://vidsrc.to/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.to/embed/movie/${id}`,
  },
  {
    id: 'vidsrc_me',
    name: 'S3',
    url: (type, id, s, e, mode) =>
      type === 'tv'
        ? `https://vidsrc.me/embed/tv?tmdb=${id}&s=${s}&e=${e}`
        : `https://vidsrc.me/embed/movie?tmdb=${id}`,
  },
  {
    id: 'vidsrc_xyz',
    name: 'S4',
    url: (type, id, s, e, mode) =>
      type === 'tv'
        ? `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`
        : `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
  },
  {
    id: 'vidking',
    name: 'S5',
    url: (type, id, s, e, mode) =>
      type === 'tv'
        ? `https://www.vidking.net/embed/tv/${id}/${s}/${e}?color=ff2e8c`
        : `https://www.vidking.net/embed/movie/${id}?color=ff2e8c`,
  },
  {
    id: 'vidsrc_pro',
    name: 'S6',
    url: (type, id, s, e, mode) =>
      type === 'tv'
        ? `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`
        : `https://vidsrc.pro/embed/movie/${id}`,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
const Player = () => {
  const { type, id, season: sParam, episode: eParam } = useParams();
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [currentServer, setCurrentServer] = useState(SERVERS[0]);
  const [selectedSeason, setSelectedSeason] = useState(parseInt(sParam) || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(parseInt(eParam) || 1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [mode, setMode] = useState('sub');
  const [isSeasonDropdownOpen, setIsSeasonDropdownOpen] = useState(false);
  const seasonDropdownRef = useRef(null);

  // Sync URL params → state
  useEffect(() => {
    if (sParam) setSelectedSeason(parseInt(sParam));
    if (eParam) setSelectedEpisode(parseInt(eParam));
  }, [sParam, eParam]);

  // Fetch media details
  useEffect(() => {
    if (!id) return;
    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const data = await tmdbFetch(`/${type}/${id}`, { language: 'en-US' });
        setDetails(data);
        if (type === 'tv' && !sParam) {
          const firstSeason = data.seasons?.find(s => s.season_number > 0) || data.seasons?.[0];
          if (firstSeason) setSelectedSeason(firstSeason.season_number);
        }
      } catch (error) {
        console.error('Error fetching player details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [id, type, sParam]);

  // Fetch TV episodes
  useEffect(() => {
    if (type !== 'tv' || !id || selectedSeason === null) return;
    const fetchEpisodes = async () => {
      try {
        setLoadingEpisodes(true);
        const data = await tmdbFetch(`/tv/${id}/season/${selectedSeason}`, { language: 'en-US' });
        setEpisodes(data.episodes || []);
      } catch (error) {
        console.error('Error fetching episodes:', error);
      } finally {
        setLoadingEpisodes(false);
      }
    };
    fetchEpisodes();
  }, [id, type, selectedSeason]);

  // Close season dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (seasonDropdownRef.current && !seasonDropdownRef.current.contains(e.target)) {
        setIsSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for player events — only from trusted origins
  useEffect(() => {
    if (!details) return;
    const title = details.title || details.name || '';

    const handleMessage = (event) => {
      // Strict origin check — silences ALL extension/cross-origin spam
      const isTrusted = TRUSTED_ORIGINS.some(origin => event.origin.startsWith(origin));
      if (!isTrusted) return;

      if (typeof event.data !== 'string') return;
      if (!event.data.includes('PLAYER_EVENT')) return;

      try {
        const message = JSON.parse(event.data);
        if (message.type === 'PLAYER_EVENT' && message.data) {
          const { event: eventName } = message.data;
          if (['timeupdate', 'pause', 'ended'].includes(eventName)) {
            const metadata = {
              title,
              poster_url: details.poster_path
                ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
                : '',
              type,
              season: selectedSeason,
              episode: selectedEpisode,
            };
            saveWatchProgress(id, message.data, metadata);
          }
        }
      } catch (_) {
        // Ignore JSON parse errors silently
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, details, type, selectedSeason, selectedEpisode]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleServerChange = (server) => {
    if (server.id === currentServer.id) return;
    setIsPlayerLoading(true);
    setCurrentServer(server);
  };

  const handleEpisodeChange = (epNum) => {
    if (epNum === selectedEpisode) return;
    setIsPlayerLoading(true);
    setSelectedEpisode(epNum);
    navigate(`/player/tv/${id}/${selectedSeason}/${epNum}`);
  };

  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setIsPlayerLoading(true);
  };

  const handleIframeLoad = () => {
    setIsPlayerLoading(false);
  };

  // ── Embed URL ────────────────────────────────────────────────────────────────
  const getEmbedUrl = () => {
    let url = currentServer.url(type, id, selectedSeason, selectedEpisode, mode);
    // Append resume time only for vidking (it supports the progress param)
    if (currentServer.id === 'vidking') {
      const resumeTime = getResumeTime(id);
      if (resumeTime > 0) {
        url += `&progress=${resumeTime}&autoPlay=true`;
      }
    }
    return url;
  };

  // ── Guards ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <Spinner />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        Content not found.
      </div>
    );
  }

  const title = details.title || details.name || 'Unknown';
  const embedUrl = getEmbedUrl();

  return (
    <div className="player-page bg-[#050505] min-h-screen text-white flex flex-col overflow-x-hidden relative">

      {/* Background Ambience */}
      {details.backdrop_path && (
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img
            src={`https://image.tmdb.org/t/p/w500${details.backdrop_path}`}
            className="w-full h-full object-cover opacity-10 blur-[120px] scale-150"
            alt=""
          />
        </div>
      )}

      <main className="relative z-10 flex flex-col lg:flex-row p-4 sm:p-8 gap-8 min-h-screen">

        {/* ── Left Side: Player ── */}
        <section className="flex-1 flex flex-col gap-6">

          {/* Top controls row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-3 text-white/60 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em] bg-white/5 border border-white/10 px-6 py-4 group w-full sm:w-auto justify-center"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="group-hover:-translate-x-1 transition-transform">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Go Back
            </button>

            <div className="flex bg-white/5 border border-white/10 p-1.5 w-full sm:w-auto justify-center">
              <button
                onClick={() => handleModeChange('sub')}
                className={`flex-1 sm:flex-none px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'sub' ? 'bg-red-600 text-white' : 'text-white/40 hover:text-white'}`}
              >
                Subtitles
              </button>
              <button
                onClick={() => handleModeChange('dub')}
                className={`flex-1 sm:flex-none px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'dub' ? 'bg-red-600 text-white' : 'text-white/40 hover:text-white'}`}
              >
                Dubbed
              </button>
            </div>
          </div>

          {/* Cinematic Player Container */}
          <div className="relative aspect-video overflow-hidden border border-white/5 bg-black">
            {isPlayerLoading && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                <Spinner />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mt-6 animate-pulse">
                  Loading Stream...
                </p>
              </div>
            )}
            <iframe
              key={`${currentServer.id}-${id}-${selectedSeason}-${selectedEpisode}-${mode}`}
              ref={iframeRef}
              src={embedUrl}
              title="Content Player"
              frameBorder="0"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full"
              onLoad={handleIframeLoad}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
            />
          </div>

          {/* Server Selection Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">
                Available Servers
              </span>
              <div className="flex items-center gap-2">
                {SERVERS.map((server) => (
                  <button
                    key={server.id}
                    onClick={() => handleServerChange(server)}
                    className={`w-10 h-10 text-[9px] font-black transition-all flex items-center justify-center border ${
                      currentServer.id === server.id
                        ? 'bg-white text-black border-white scale-105'
                        : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {server.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-green-500 animate-pulse rounded-full" />
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                Network Verified
              </span>
            </div>
          </div>

          {/* Quick Details */}
          <div className="bg-white/5 border border-white/10 p-8 flex items-center gap-6">
            {details.poster_path && (
              <img
                src={`https://image.tmdb.org/t/p/w200${details.poster_path}`}
                alt={title}
                className="w-16 sm:w-20 border border-white/10"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-3xl font-black tracking-tighter truncate uppercase">
                {title}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                {details.status && (
                  <span className="text-red-500 text-[10px] font-black uppercase tracking-widest">
                    {details.status}
                  </span>
                )}
                <span className="text-white/30 text-[10px] font-black">
                  {(details.release_date || details.first_air_date || '').split('-')[0]}
                </span>
              </div>
            </div>
          </div>

        </section>

        {/* ── Right Side: Sidebar ── */}
        <aside className="w-full lg:w-[400px] flex flex-col gap-6">

          {/* TV Episode List */}
          {type === 'tv' && (
            <div className="bg-white/5 border border-white/10 p-8 relative">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em]">
                  Episodes
                </h3>

                {/* Season Dropdown */}
                <div className="relative z-50 min-w-[120px]" ref={seasonDropdownRef}>
                  <button
                    onClick={() => setIsSeasonDropdownOpen(prev => !prev)}
                    className="w-full flex items-center justify-between px-5 py-3 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/90 hover:bg-white/10 transition-all"
                  >
                    S{selectedSeason}
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="4"
                      className={`transition-transform duration-300 ${isSeasonDropdownOpen ? 'rotate-180' : ''}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {isSeasonDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#0A0A0A] border border-white/10 p-2 z-[100]">
                      <div className="max-h-[250px] overflow-y-auto py-1">
                        {details.seasons
                          ?.filter(s => s.season_number > 0)
                          .map(s => (
                            <button
                              key={s.id}
                              onClick={() => {
                                setSelectedSeason(s.season_number);
                                setIsSeasonDropdownOpen(false);
                                setIsPlayerLoading(true);
                              }}
                              className={`w-full text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                                selectedSeason === s.season_number
                                  ? 'bg-white text-black'
                                  : 'text-white/60 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              Season {s.season_number}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Episode Grid */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 max-h-[600px]">
                {loadingEpisodes ? (
                  <Spinner />
                ) : (
                  episodes.map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => handleEpisodeChange(ep.episode_number)}
                      className={`flex items-center gap-4 w-full p-3 transition-all group ${
                        selectedEpisode === ep.episode_number
                          ? 'bg-white/10 border border-white/10'
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="w-12 h-12 overflow-hidden shrink-0 border border-white/5 bg-white/5 flex items-center justify-center">
                        <span className={`font-black text-xs ${selectedEpisode === ep.episode_number ? 'text-red-500' : 'text-white/40'}`}>
                          {ep.episode_number}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-xs font-black truncate tracking-tight ${selectedEpisode === ep.episode_number ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                          {ep.name}
                        </p>
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.1em] mt-1 truncate">
                          {ep.air_date?.split('-')[0] || 'Available'}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Movie Info Panel */}
          {type === 'movie' && (
            <div className="bg-white/5 border border-white/10 p-8 space-y-6">
              <h3 className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em]">
                Quick Information
              </h3>
              {details.overview && (
                <p className="text-sm text-white/60 leading-relaxed font-medium line-clamp-10">
                  {details.overview}
                </p>
              )}
              {details.genres?.length > 0 && (
                <div className="pt-4 border-t border-white/5 flex flex-wrap gap-3">
                  {details.genres.map(g => (
                    <span key={g.id} className="px-3 py-1 bg-white/5 text-[9px] font-black uppercase tracking-widest text-white/40 border border-white/5">
                      {g.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Runtime / Rating */}
              <div className="pt-4 border-t border-white/5 flex items-center gap-6">
                {details.runtime && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Runtime</span>
                    <span className="text-sm font-black text-white/70">{details.runtime} min</span>
                  </div>
                )}
                {details.vote_average != null && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Rating</span>
                    <span className="text-sm font-black text-red-500">★ {details.vote_average?.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </aside>
      </main>
    </div>
  );
};

export default Player;