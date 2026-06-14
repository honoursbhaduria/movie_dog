import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { tmdbFetch } from '../utils/tmdb';
import { useWatchTogether } from '../hooks/useWatchTogether';
import Spinner from '../components/Spinner';

const SERVERS = [
 { id: 'twoembed', name: 'S1', url: (type, id, s, e, t) => type === 'tv' ? `https://www.2embed.cc/embedtv/${id}?s=${s}&e=${e}${t ? `&t=${t}` : ''}` : `https://www.2embed.cc/embed/${id}${t ? `?t=${t}` : ''}` },
 { id: 'vidsrc_to', name: 'S2', url: (type, id, s, e, t) => type === 'tv' ? `https://vidsrc.to/embed/tv/${id}/${s}/${e}` : `https://vidsrc.to/embed/movie/${id}` },
 { id: 'vidsrc_me', name: 'S3', url: (type, id, s, e, t) => type === 'tv' ? `https://vidsrc.me/embed/tv?tmdb=${id}&s=${s}&e=${e}${t ? `&t=${t}` : ''}` : `https://vidsrc.me/embed/movie?tmdb=${id}${t ? `&t=${t}` : ''}` },
];

const WatchTogetherRoom = () => {
 const { type, id } = useParams();
 const [searchParams] = useSearchParams();
 const roomId = searchParams.get('room');
 const navigate = useNavigate();
 
 const [details, setDetails] = useState(null);
 const [isLoading, setIsLoading] = useState(true);
 const [currentServer, setCurrentServer] = useState(SERVERS[0]);
 const [selectedSeason, setSelectedSeason] = useState(1);
 const [selectedEpisode, setSelectedEpisode] = useState(1);
 const [isCopied, setIsCopied] = useState(false);
 const [isSidebarOpen, setIsSidebarOpen] = useState(true);
 const [chatInput, setChatInput] = useState('');
 
 const iframeRef = useRef(null);
 const [playerSrc, setPlayerSrc] = useState('');
 const lastAppliedState = useRef({ time: 0, playing: false, sourceKey: '' });
 const chatEndRef = useRef(null);

 const { 
 messages, 
 users, 
 roomTime,
 isPlaying,
 isOwner,
 ownerName,
 lastSyncAt,
 sendMessage, 
 syncPlayback,
 userName 
 } = useWatchTogether(roomId, null, { movieId: id, type: type });

 // Compute live time for display and syncing
 const [liveDisplayTime, setLiveDisplayTime] = useState(0);

 useEffect(() => {
 let interval;
 if (isPlaying) {
  interval = setInterval(() => {
  const elapsed = (Date.now() - lastSyncAt) / 1000;
  setLiveDisplayTime(Math.max(0, roomTime + elapsed));
  }, 1000);
 } else {
  setLiveDisplayTime(roomTime);
 }
 return () => clearInterval(interval);
 }, [isPlaying, roomTime, lastSyncAt]);

 // Handle setting the iframe source without infinite loops
 useEffect(() => {
 const sourceKey = `${currentServer.id}-${type}-${id}-${selectedSeason}-${selectedEpisode}`;
 const previous = lastAppliedState.current;
 const currentTime = Math.max(0, Math.floor(roomTime));
 const timeDrift = Math.abs(currentTime - previous.time);

 const isFirstLoad = !playerSrc;
 const sourceChanged = previous.sourceKey !== sourceKey;
 const playStateChanged = previous.playing !== isPlaying;

 let needsReload = false;

 if (isOwner) {
  needsReload = isFirstLoad || sourceChanged;
 } else {
  needsReload = isFirstLoad || sourceChanged || playStateChanged || timeDrift > 15;
 }

 if (!needsReload) return;

 const baseUrl = currentServer.url(type, id, selectedSeason, selectedEpisode, currentTime);
 const nextPlayerSrc = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${currentTime}${isPlaying ? '&autoplay=1&mute=1' : '&autoplay=0'}`;

 lastAppliedState.current = {
  time: currentTime,
  playing: isPlaying,
  sourceKey,
 };

 setPlayerSrc(nextPlayerSrc);
 }, [currentServer, type, id, selectedSeason, selectedEpisode, isPlaying, roomTime, isOwner, playerSrc]);

 // Owner's postMessage listener for native iframe controls (if embed supports it)
 useEffect(() => {
 if (!isOwner) return;

 const handlePlayerMessage = (event) => {
  if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) return;
  if (typeof event.data !== 'string' || !event.data.includes('PLAYER_EVENT')) return;

  try {
  const message = JSON.parse(event.data);
  if (message.type !== 'PLAYER_EVENT' || !message.data) return;

  const eventName = message.data.event;
  const nextTime = Number(message.data.currentTime ?? message.data.time ?? message.data.position ?? liveDisplayTime);

  if (!Number.isFinite(nextTime)) return;

  if (eventName === 'play') {
   syncPlayback(nextTime, true);
  } else if (eventName === 'pause' || eventName === 'ended') {
   syncPlayback(nextTime, false);
  } else if (eventName === 'timeupdate') {
   if (Math.abs(nextTime - liveDisplayTime) > 3) {
   syncPlayback(nextTime, isPlaying);
   }
  }
  } catch (error) {
  // ignore
  }
 };

 window.addEventListener('message', handlePlayerMessage);
 return () => window.removeEventListener('message', handlePlayerMessage);
 }, [isOwner, liveDisplayTime, isPlaying, syncPlayback]);

 // Fetch movie details
 useEffect(() => {
 if (!id || !type) return;
 const fetchDetails = async () => {
  try {
  const data = await tmdbFetch(`/${type}/${id}`, { language: 'en-US' });
  setDetails(data);
  if (type === 'tv' && data.seasons?.length > 0) {
   setSelectedSeason(data.seasons.find(s => s.season_number > 0)?.season_number || 1);
  }
  } catch (error) { console.error(error); }
  finally { setIsLoading(false); }
 };
 fetchDetails();
 }, [id, type]);

 useEffect(() => {
 chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages]);

 if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-black"><Spinner /></div>;
 if (!details) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Room Error.</div>;

 const handleCopyRoomId = async () => {
 if (!roomId) return;
 try {
  await navigator.clipboard.writeText(roomId);
  setIsCopied(true);
  window.setTimeout(() => setIsCopied(false), 2000);
 } catch {
  setIsCopied(false);
 }
 };

 const handleCopyLink = async () => {
 if (!roomId) return;
 try {
  await navigator.clipboard.writeText(window.location.href);
  setIsCopied(true);
  window.setTimeout(() => setIsCopied(false), 2000);
 } catch {
  setIsCopied(false);
 }
 };

 const togglePlayPause = () => {
 if (!isOwner) return;
 syncPlayback(liveDisplayTime, !isPlaying);
 };

 const forceSync = () => {
 if (!isOwner) return;
 syncPlayback(liveDisplayTime, isPlaying);
 const baseUrl = currentServer.url(type, id, selectedSeason, selectedEpisode, Math.floor(liveDisplayTime));
 setPlayerSrc(`${baseUrl}${baseUrl.includes('?') ? '&' : '?'}t=${Math.floor(liveDisplayTime)}&autoplay=${isPlaying ? '1' : '0'}`);
 };

 const formatTime = (time) => {
 const hours = Math.floor(time / 3600);
 const minutes = Math.floor((time % 3600) / 60);
 const seconds = Math.floor(time % 60);
 if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
 return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
 };

 const handleChatSubmit = (e) => {
 e.preventDefault();
 if (chatInput.trim()) {
  sendMessage(chatInput);
  setChatInput('');
 }
 };

 return (
 <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20">
  
  {/* ── Navigation Bar (SyncFlix style) ── */}
  <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/5">
  <div className="max-w-[1800px] mx-auto px-8 lg:px-16">
   <div className="flex items-center justify-between h-16">
   <button onClick={() => navigate(-1)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
    <span className="font-bold tracking-widest text-lg">MOVIE</span>
    <span className="font-light tracking-widest text-lg text-white/50">DOG</span>
   </button>

   <AnimatePresence>
    {roomId && (
    <motion.div
     initial={{ opacity: 0, y: -10 }}
     animate={{ opacity: 1, y: 0 }}
     className="flex items-center gap-4"
    >
     <span className="text-[10px] font-bold tracking-[0.2em] text-white/40">ROOM</span>
     <span className="font-mono text-sm tracking-[0.2em] text-white/90">{roomId}</span>
    </motion.div>
    )}
   </AnimatePresence>

   <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-white/50 hover:text-white transition-colors">
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
    </svg>
   </button>
   </div>
  </div>
  </nav>

  {/* ── Main Layout ── */}
  <div className="pt-16 min-h-screen flex relative">
  
  {/* ── Video Section ── */}
  <main className="flex-1 p-6 lg:p-8 flex flex-col min-w-0">
   <div className="max-w-[1400px] mx-auto w-full space-y-8">
   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
    <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-2 uppercase">Watch Party</p>
    <h1 className="text-2xl font-light tracking-wide truncate">
    Synchronized <span className="italic text-white/50">{details.title || details.name}</span>
    </h1>
   </motion.div>

   <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay: 0.1 }}
    className="w-full relative group"
   >
    <div className="relative aspect-video w-full -none lg: overflow-hidden bg-[#0a0a0a] border border-white/5">
    <iframe
     ref={iframeRef}
     src={playerSrc}
     className="w-full h-full"
     style={{ pointerEvents: isOwner ? 'auto' : 'none' }}
     frameBorder="0"
     allow="autoplay; fullscreen; picture-in-picture"
     allowFullScreen
    ></iframe>

    {!isOwner && (
     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
     <div className="absolute bottom-6 flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-4 py-2 ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
      <span className="text-[11px] font-medium text-white/60">Owner controls playback</span>
     </div>
     </div>
    )}
    </div>

    {/* Minimal Bottom Bar */}
    <div className="mt-4 flex items-center justify-between text-white/50 px-2">
    <div className="flex items-center gap-4">
     <div className="flex items-center gap-2">
     <span className={`w-1.5 h-1.5 ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
     <span className="text-[10px] font-bold tracking-widest uppercase">{isPlaying ? 'Playing' : 'Paused'}</span>
     </div>
     <span className="font-mono text-xs tracking-wider">{formatTime(liveDisplayTime)}</span>
    </div>
    
    {isOwner && (
     <div className="flex items-center gap-2">
     <button onClick={togglePlayPause} className="px-4 py-1.5 border border-white/10 hover:border-white/30 text-[10px] font-bold tracking-widest uppercase transition-colors">
      {isPlaying ? 'Pause' : 'Play'}
     </button>
     <button onClick={forceSync} className="px-4 py-1.5 border border-white/10 hover:border-white/30 text-[10px] font-bold tracking-widest uppercase transition-colors">
      Sync Now
     </button>
     </div>
    )}
    </div>
   </motion.div>
   </div>
  </main>

  {/* ── Sidebar (SyncFlix style) ── */}
  <AnimatePresence>
   {isSidebarOpen && (
   <motion.aside
    initial={{ x: 100, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    exit={{ x: 100, opacity: 0 }}
    transition={{ type: "spring", damping: 25, stiffness: 200 }}
    className="w-full lg:w-[400px] bg-[#050505] border-l border-white/5 p-8 flex flex-col fixed right-0 top-16 bottom-0 lg:relative lg:top-0 z-40"
   >
    <div className="shrink-0 mb-8 space-y-6">
    <div>
     <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-2">SYNC ROOM</p>
     <p className="text-sm text-white/50 leading-relaxed">Sync videos with friends in real-time</p>
    </div>
    
    <div className="h-px bg-white/5 w-full" />
    
    {/* Room Info Card */}
    <div className="border border-white/10 p-6 text-center bg-white/[0.02]">
     <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3">ROOM CODE</p>
     <p className="font-mono text-2xl tracking-[0.3em] text-white/90">{roomId}</p>
     
     <div className="flex gap-2 mt-6">
     <button onClick={handleCopyRoomId} className="flex-1 border border-white/10 hover:bg-white/5 text-[10px] font-bold tracking-widest py-3 transition-colors">
      {isCopied ? "COPIED!" : "COPY CODE"}
     </button>
     <button onClick={handleCopyLink} className="flex-1 bg-white hover:bg-white/90 text-black text-[10px] font-bold tracking-widest py-3 transition-colors">
      SHARE LINK
     </button>
     </div>
    </div>

    {/* Role Badge */}
    <div className="flex justify-center">
     <span className={`text-[10px] font-bold tracking-widest ${isOwner ? "text-amber-400" : "text-cyan-400"}`}>
     {isOwner ? "★ HOST" : "● GUEST"}
     </span>
    </div>

    {/* Users List */}
    <div className="border border-white/5 p-4 bg-white/[0.01]">
     <p className="text-[10px] font-bold tracking-[0.2em] text-white/40 mb-4">WATCHING ({users.length})</p>
     <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
     {users.map((name, i) => (
      <div key={i} className="flex items-center gap-3 p-2 bg-white/[0.02] border border-white/[0.02]">
      <div className="w-7 h-7 border border-white/20 flex items-center justify-center text-[10px] font-bold uppercase text-white/70">
       {name[0]}
      </div>
      <span className="text-xs font-medium text-white/80 flex-1 truncate">{name}</span>
      {name === ownerName && (
       <span className="text-[9px] text-amber-400/80 tracking-widest font-bold">HOST</span>
      )}
      </div>
     ))}
     </div>
    </div>
    </div>

    {/* Chat Area inside Sidebar */}
    <div className="flex-1 min-h-0 flex flex-col border border-white/5 bg-white/[0.01]">
    <div className="p-4 border-b border-white/5">
     <p className="text-[10px] font-bold tracking-[0.2em] text-white/40">ROOM CHAT</p>
    </div>
    
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
     {messages.map((msg, i) => (
     <div key={i} className={`flex flex-col ${msg.type === 'system' ? 'items-center' : 'items-start'}`}>
      {msg.type === 'system' ? (
      <p className="text-[10px] italic text-white/30">{msg.text}</p>
      ) : (
      <div className="max-w-[90%]">
       <p className="text-[10px] font-bold tracking-wider text-white/40 mb-1">{msg.name}</p>
       <p className={`text-xs p-3 leading-relaxed border ${msg.name === userName ? 'bg-white/10 border-white/10' : 'bg-white/5 border-white/5'}`}>
       {msg.text}
       </p>
      </div>
      )}
     </div>
     ))}
     <div ref={chatEndRef} />
    </div>
    
    <form onSubmit={handleChatSubmit} className="p-3 border-t border-white/5 flex gap-2">
     <input
     type="text"
     value={chatInput}
     onChange={(e) => setChatInput(e.target.value)}
     placeholder="Send a message..."
     className="flex-1 bg-white/5 border border-white/10 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors -none"
     />
     <button type="submit" className="px-4 bg-white text-black text-[10px] font-bold tracking-widest hover:bg-white/90 transition-colors">
     SEND
     </button>
    </form>
    </div>
   </motion.aside>
   )}
  </AnimatePresence>

  </div>
 </div>
 );
};

export default WatchTogetherRoom;
