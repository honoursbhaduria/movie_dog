import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchWithCache } from '../utils/cache'
import { saveWatchProgress, getResumeTime } from '../utils/streaming'
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

const SERVERS = [
  { id: 'vidking', name: 'Server 1 (Vidking)', url: (type, id, s, e) => type === 'tv' ? `https://www.vidking.net/embed/tv/${id}/${s}/${e}` : `https://www.vidking.net/embed/movie/${id}` },
  { id: 'superembed', name: 'Server 2 (SuperEmbed)', url: (type, id, s, e) => type === 'tv' ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}` : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1` },
  { id: 'vidsrc', name: 'Server 3 (Vidsrc)', url: (type, id, s, e) => type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e}` : `https://vidsrc.me/embed/movie?tmdb=${id}` },
  { id: 'vidsrc_xyz', name: 'Server 4 (Vidsrc XYZ)', url: (type, id, s, e) => type === 'tv' ? `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}` : `https://vidsrc.xyz/embed/movie?tmdb=${id}` },
];


const Player = () => {
  const { type, id, season: sParam, episode: eParam } = useParams();
  const navigate = useNavigate();
  
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentServer, setCurrentServer] = useState(SERVERS[0]);
  const [mode, setMode] = useState('dub'); // 'dub' is now the default
  const [selectedSeason, setSelectedSeason] = useState(parseInt(sParam) || 1);
  const [selectedEpisode, setSelectedEpisode] = useState(parseInt(eParam) || 1);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [activeEpisodeData, setActiveEpisodeData] = useState(null);

  const playerRef = useRef(null);
  const isStreamingUnlocked = localStorage.getItem('streaming_unlocked') === 'true';

  useEffect(() => {
    if (!isStreamingUnlocked) {
      navigate('/');
      return;
    }

    const fetchDetails = async () => {
      try {
        setIsLoading(true);
        const data = await fetchWithCache(`${API_BASE_URL}/${type}/${id}?language=en-US`, API_OPTIONS);
        setDetails(data);
        
        if (type === 'tv' && !sParam) {
           const firstSeason = data.seasons?.find(s => s.season_number > 0) || data.seasons?.[0];
           if (firstSeason) setSelectedSeason(firstSeason.season_number);
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [id, type, sParam]);

  useEffect(() => {
    const fetchEpisodes = async () => {
      if (type !== 'tv' || !id || selectedSeason === null) return;
      
      try {
        setLoadingEpisodes(true);
        const data = await fetchWithCache(`${API_BASE_URL}/tv/${id}/season/${selectedSeason}?language=en-US`, API_OPTIONS);
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
      if (typeof event.data === "string") {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "PLAYER_EVENT") {
            if (["timeupdate", "pause", "ended"].includes(message.data.event)) {
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
          // Ignore non-JSON messages from embedded iframes
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
    const hasParams = url.includes('?');
    
    if (currentServer.id === 'vidking') {
      url += `${hasParams ? '&' : '?'}color=ff2e8c&autoPlay=true&progress=${resumeTime}`;
    }
    
    if (mode === 'dub') {
      url += `${url.includes('?') ? '&' : '?'}ds_lang=en`;
    }
    
    return url;
  };

  const embedUrl = getEmbedUrl();

  return (
    <div className="player-page bg-[#0a0a0c] min-h-screen text-white flex flex-col overflow-hidden">
      {/* ── Top Header ── */}
      <header className="player-nav flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#111116]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[200] mt-0">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <button onClick={() => navigate(-1)} className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-widest text-white truncate max-w-[150px] xs:max-w-[250px] sm:max-w-none">{title}</h1>
            {type === 'tv' && (
              <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-0.5 truncate">
                EP {selectedEpisode}: {activeEpisodeData?.name || 'Untitled'}
              </p>
            )}
          </div>
        </div>
        
        <button onClick={() => navigate('/')} className="p-2 sm:p-2.5 rounded-full bg-[#ff2e8c15] text-[#ff2e8c] hover:bg-[#ff2e8c25] transition-all shrink-0 ml-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ── Player Section ── */}
        <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-8">
            <div className="aspect-video bg-black rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5 relative group">
              <iframe
                ref={playerRef}
                src={embedUrl}
                title="Content Player"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; fullscreen"
                className="w-full h-full"
              ></iframe>
            </div>

            {/* Mode & Server Selection */}
            <div className="mt-10 space-y-6">
              {/* Language Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Language Mode:</span>
                </div>
                <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                  <button 
                    onClick={() => setMode('sub')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'sub' ? 'bg-[#ff2e8c] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Subbed
                  </button>
                  <button 
                    onClick={() => setMode('dub')}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'dub' ? 'bg-[#ff2e8c] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Dubbed
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Select Server:</span>
                 </div>
                 <button 
                   onClick={() => window.location.reload()} 
                   className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold text-gray-400 transition-all border border-white/5"
                 >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    Reload Player
                 </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {SERVERS.map((server) => (
                  <button 
                    key={server.id}
                    onClick={() => setCurrentServer(server)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 ${
                      currentServer.id === server.id 
                      ? 'bg-[#00e5ff15] border-[#00e5ff] text-[#00e5ff] shadow-[0_0_20px_rgba(0,229,255,0.2)]' 
                      : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${currentServer.id === server.id ? 'bg-[#00e5ff]' : 'bg-gray-600'}`} />
                    {server.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Episode Info */}
            <div className="mt-12 border-t border-white/5 pt-10 pb-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-black uppercase tracking-tighter">
                  {type === 'tv' ? `Episode ${selectedEpisode}` : title}
                </h2>
                <div className="flex items-center gap-2 text-[#00e5ff] bg-[#00e5ff10] px-3 py-1 rounded-full border border-[#00e5ff20]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Now Playing</span>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-4xl italic">
                {activeEpisodeData?.overview || details.overview}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <aside className="w-full lg:w-[400px] bg-[#0d0d12] border-l border-white/5 flex flex-col h-[500px] lg:h-full">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff2e8c" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
               <h3 className="font-black uppercase tracking-widest text-sm">Episode List</h3>
            </div>
            <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2.5 py-1 rounded-lg">
              {episodes.length} Total
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {type === 'tv' ? (
              episodes.map(ep => (
                <button 
                  key={ep.id}
                  onClick={() => {
                    setSelectedEpisode(ep.episode_number);
                    navigate(`/player/tv/${id}/${selectedSeason}/${ep.episode_number}`);
                  }}
                  className={`flex gap-4 w-full text-left p-3 rounded-2xl transition-all border-2 group ${
                    selectedEpisode === ep.episode_number 
                    ? 'bg-[#ff2e8c10] border-[#ff2e8c] shadow-[0_0_20px_rgba(255,46,140,0.15)]' 
                    : 'bg-[#16161d] border-transparent hover:border-white/10'
                  }`}
                >
                  <div className="w-28 aspect-video rounded-xl overflow-hidden shrink-0 relative bg-black shadow-lg">
                    <img 
                      src={ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : `https://image.tmdb.org/t/p/w300${details.backdrop_path}`} 
                      className={`w-full h-full object-cover transition-transform duration-500 ${selectedEpisode === ep.episode_number ? 'scale-110' : 'group-hover:scale-110'}`} 
                      alt="" 
                    />
                    {selectedEpisode === ep.episode_number && (
                      <div className="absolute inset-0 bg-[#ff2e8c40] flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center min-w-0">
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${selectedEpisode === ep.episode_number ? 'text-[#ff2e8c]' : 'text-gray-500'}`}>
                      Episode {ep.episode_number}
                    </p>
                    <p className={`text-xs font-bold truncate ${selectedEpisode === ep.episode_number ? 'text-white' : 'text-gray-300'}`}>
                      {ep.name}
                    </p>
                  </div>
                </button>
              ))
            ) : (
               <div className="p-2 space-y-6">
                 <div className="rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                    <img src={`https://image.tmdb.org/t/p/w500${details.poster_path}`} className="w-full h-full object-cover" alt="" />
                 </div>
                 <div className="bg-[#16161d] p-6 rounded-[32px] border border-white/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full text-[10px] font-black border border-yellow-400/20 flex items-center gap-1.5">
                        <img src="/star.svg" className="w-3 h-3" alt="" />
                        {details.vote_average?.toFixed(1)}
                      </div>
                      <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">{details.release_date?.split('-')[0]}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-400 font-medium">{details.tagline}</p>
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
