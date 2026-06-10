import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchWithCache } from '../utils/cache'
import { saveWatchProgress, getResumeTime } from '../utils/streaming'
import Spinner from './Spinner'

import { tmdbFetch, TMDB_BASE_URL, TMDB_API_KEY } from '../utils/tmdb'

const API_BASE_URL = TMDB_BASE_URL;
const API_KEY = TMDB_API_KEY;

const SERVERS = [
  { id: 'vidsrc_to', name: 'Server 1', url: (type, id, s, e) => type === 'tv' ? `https://vidsrc.to/embed/tv/${id}/${s}/${e}` : `https://vidsrc.to/embed/movie/${id}` },
  { id: 'vidsrc_me', name: 'Server 2', url: (type, id, s, e) => type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&s=${s}&e=${e}` : `https://vidsrc.me/embed/movie?tmdb=${id}` },
  { id: 'vidsrc_xyz', name: 'Server 3', url: (type, id, s, e) => type === 'tv' ? `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}` : `https://vidsrc.xyz/embed/movie?tmdb=${id}` },
  { id: 'vidking', name: 'Server 4', url: (type, id, s, e) => type === 'tv' ? `https://www.vidking.net/embed/tv/${id}/${s}/${e}?color=ff2e8c` : `https://www.vidking.net/embed/movie/${id}?color=ff2e8c` },
  { id: 'vidsrc_pro', name: 'Server 5', url: (type, id, s, e) => type === 'tv' ? `https://vidsrc.pro/embed/tv/${id}/${s}/${e}` : `https://vidsrc.pro/embed/movie/${id}` },
  { id: 'twoembed', name: 'Server 6', url: (type, id, s, e) => type === 'tv' ? `https://www.2embed.cc/embedtv/${id}?s=${s}&e=${e}` : `https://www.2embed.cc/embed/${id}` },
];


const Player = () => {
  const { type, id, season: sParam, episode: eParam } = useParams();
  const navigate = useNavigate();
  const playerRef = useRef(null);

  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentServer, setCurrentServer] = useState(SERVERS[0]);
  const [selectedSeason, setSelectedSeason] = useState(parseInt(sParam) || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(parseInt(eParam) || 1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [activeEpisodeData, setActiveEpisodeData] = useState(null);
  const [mode, setMode] = useState('sub'); // 'sub' or 'dub'
  const [adBlockDetected, setAdBlockDetected] = useState(false);

  // Ad-Blocker Detection (Subtle)
  useEffect(() => {
    const checkAdBlock = async () => {
      try {
        await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', { method: 'HEAD', mode: 'no-cors' });
      } catch (e) {
        setAdBlockDetected(true);
      }
    };
    checkAdBlock();
  }, []);

  useEffect(() => {
    if (sParam) setSelectedSeason(parseInt(sParam));
    if (eParam) setSelectedEpisode(parseInt(eParam));
  }, [sParam, eParam]);

  useEffect(() => {
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

    if (id) {
      fetchDetails();
    }
  }, [id, type, sParam]);

  useEffect(() => {
    const fetchEpisodes = async () => {
      if (type !== 'tv' || !id || selectedSeason === null) return;
      
      try {
        setLoadingEpisodes(true);
        const data = await tmdbFetch(`/tv/${id}/season/${selectedSeason}`, { language: 'en-US' });
        setEpisodes(data.episodes || []);
        
        // Update active episode info
        const active = data.episodes?.find(e => e.episode_number === selectedEpisode);
        if (active) setActiveEpisodeData(active);
      } catch (error) {
        console.error('Error fetching episodes:', error);
      } finally {
        setLoadingEpisodes(false);
      }
    };

    fetchEpisodes();
  }, [id, type, selectedSeason, selectedEpisode]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (typeof event.data !== 'string') return;
      
      if (event.data.includes("PLAYER_EVENT")) {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "PLAYER_EVENT" && message.data) {
            const { event: eventName } = message.data;
            if (["timeupdate", "pause", "ended"].includes(eventName)) {
              const metadata = {
                title: details.title || details.name,
                poster_url: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : '',
                type: type,
                season: selectedSeason,
                episode: selectedEpisode
              };
              saveWatchProgress(id, message.data, metadata);
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    };
    if (details) {
      window.addEventListener("message", handleMessage);
    }
    return () => window.removeEventListener("message", handleMessage);
  }, [id, details, type, selectedSeason, selectedEpisode]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]"><Spinner /></div>;
  if (!details) return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c] text-white">Content not found.</div>;

  const title = details.title || details.name;
  const resumeTime = getResumeTime(id);
  
  const getEmbedUrl = () => {
    let url = currentServer.url(type, id, selectedSeason, selectedEpisode);
    
    // Add resume progress only for supported servers (Vidking)
    if (currentServer.id === 'vidking' && resumeTime > 0) {
      url += `${url.includes('?') ? '&' : '?'}progress=${resumeTime}&autoPlay=true`;
    }
    
    return url;
  };

  const embedUrl = getEmbedUrl();

  return (
    <div className="player-page bg-[#0a0a0c] min-h-screen text-white flex flex-col overflow-hidden">
      {/* ── Top Header ── */}
      <header className="player-nav flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#111116]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[200] mt-0">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-all text-xs sm:text-sm font-bold bg-white/5 px-3 sm:px-4 py-2 rounded-xl border border-white/5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          <span className="hidden xs:inline">Back</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/logo.png" alt="Logo" className="w-5 h-5 sm:w-7 sm:h-7" />
          <span className="font-black text-base sm:text-lg tracking-tighter uppercase text-gradient">MovieDog</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
           <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
              <button onClick={() => setMode('sub')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'sub' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Sub</button>
              <button onClick={() => setMode('dub')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'dub' ? 'bg-primary text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>Dub</button>
           </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Player Container */}
        <section className="flex-1 flex flex-col bg-black relative min-h-[300px]">
            {adBlockDetected && (
              <div className="bg-red-600/20 border-b border-red-500/30 text-red-400 px-4 py-1.5 text-center text-[10px] font-bold uppercase tracking-widest">
                Ad-Blocker detected. If video fails to load, please disable it.
              </div>
            )}
            
            <div className="flex-1 relative">
              <iframe
                ref={playerRef}
                src={embedUrl}
                title="Content Player"
                frameBorder="0"
                allow="autoplay; fullscreen"
                referrerPolicy="origin"
                className="w-full h-full"
              ></iframe>
            </div>

            {/* Server Selection Toolbar */}
            <div className="p-3 sm:p-4 bg-[#111116] border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
               <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-2">Switch Server</span>
                  {SERVERS.map((server) => (
                    <button 
                      key={server.id}
                      onClick={() => setCurrentServer(server)}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all border ${currentServer.id === server.id ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(255,46,140,0.4)]' : 'bg-white/5 border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
                    >
                      {server.name}
                    </button>
                  ))}
               </div>
               
               <p className="text-[10px] text-gray-500 hidden sm:block italic">Streaming directly from secure providers.</p>
            </div>
        </section>

        {/* Right Side: Sidebar */}
        <aside className="w-full lg:w-[380px] bg-[#0d0d12] border-l border-white/5 flex flex-col overflow-hidden">
          <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
            
            <div className="space-y-4">
               <div className="flex gap-4">
                  <img src={`https://image.tmdb.org/t/p/w200${details.poster_path}`} alt="" className="w-20 sm:w-24 rounded-xl shadow-2xl border border-white/5" />
                  <div className="flex-1 py-1">
                     <h2 className="text-lg sm:text-xl font-black leading-tight line-clamp-2">{title}</h2>
                     <div className="flex items-center gap-2 mt-2">
                        <span className="bg-primary/20 text-primary text-[9px] font-black px-2 py-0.5 rounded-md uppercase">{details.status}</span>
                        <span className="text-gray-400 text-[10px] font-bold">{details.release_date?.split('-')[0] || details.first_air_date?.split('-')[0]}</span>
                     </div>
                  </div>
               </div>
               
               {type === 'tv' && activeEpisodeData && (
                 <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Playing Now</p>
                    <h3 className="text-sm font-black text-white line-clamp-1">S{selectedSeason} E{selectedEpisode}: {activeEpisodeData.name}</h3>
                    <p className="text-[11px] text-gray-400 leading-relaxed mt-2 line-clamp-2">{activeEpisodeData.overview || 'Enjoy the show!'}</p>
                 </div>
               )}
            </div>

            {type === 'tv' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Episodes</h3>
                   <select 
                    value={selectedSeason} 
                    onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-bold outline-none cursor-pointer"
                   >
                    {details.seasons?.filter(s => s.season_number > 0).map(s => (
                      <option key={s.id} value={s.season_number}>Season {s.season_number}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                   {loadingEpisodes ? <Spinner /> : episodes.map((ep) => (
                     <button 
                       key={ep.id}
                       onClick={() => {
                         setSelectedEpisode(ep.episode_number);
                         navigate(`/player/tv/${id}/${selectedSeason}/${ep.episode_number}`);
                       }}
                       className={`flex items-center gap-3 w-full p-2 rounded-xl transition-all border ${selectedEpisode === ep.episode_number ? 'bg-primary/10 border-primary/30' : 'bg-transparent border-transparent grayscale hover:grayscale-0'}`}
                     >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/20 shrink-0 relative">
                           <img src={ep.still_path ? `https://image.tmdb.org/t/p/w185${ep.still_path}` : `https://image.tmdb.org/t/p/w185${details.backdrop_path}`} className="w-full h-full object-cover" alt="" />
                           <div className="absolute inset-0 flex items-center justify-center font-black text-[9px] bg-black/40">{ep.episode_number}</div>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                           <p className={`text-xs font-black truncate ${selectedEpisode === ep.episode_number ? 'text-primary' : 'text-gray-300'}`}>{ep.name}</p>
                        </div>
                     </button>
                   ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default Player;
