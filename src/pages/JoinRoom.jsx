import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import GridBackground from '../components/GridBackground';
import { tmdbFetch } from '../utils/tmdb';

const getWsUrl = () => {
 if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
 return `http://${window.location.hostname}:8080`;
};

const JoinRoom = () => {
 const navigate = useNavigate();
 const [roomIdInput, setRoomIdInput] = useState('');
 const [userName, setUserName] = useState('');
 const [error, setError] = useState('');
 const [isChecking, setIsChecking] = useState(false);
 const [bgMovies, setBgMovies] = useState([]);
 const timeoutRef = useRef(null);

 useEffect(() => {
 const fetchBgMovies = async () => {
  try {
  const data = await tmdbFetch('/movie/popular', { language: 'en-US', page: 1 });
  setBgMovies(data.results || []);
  } catch (err) {
  console.error("Failed to fetch bg movies:", err);
  }
 };
 fetchBgMovies();
 }, []);

 const handleJoin = () => {
 const trimmedRoomId = roomIdInput.trim();
 const trimmedName = userName.trim();

 if (!trimmedRoomId || !trimmedName) {
  setError('PLEASE ENTER BOTH ROOM ID AND YOUR NAME');
  return;
 }

 setIsChecking(true);
 setError('');

 if (timeoutRef.current) clearTimeout(timeoutRef.current);

 const socket = io(getWsUrl(), { transports: ['websocket'] });

 socket.on('connect', () => {
  socket.emit('check-room', trimmedRoomId);
 });

 socket.on('room-exists', ({ exists, metadata }) => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  if (exists && metadata) {
  navigate(`/watch/${metadata.type}/${metadata.movieId}?room=${trimmedRoomId}&name=${encodeURIComponent(trimmedName)}`);
  } else {
  setError('ROOM NOT FOUND. PLEASE CHECK THE ID.');
  }
  setIsChecking(false);
  socket.close();
 });

 socket.on('connect_error', () => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  setError('UNABLE TO CONNECT TO THE ROOM SERVICE.');
  setIsChecking(false);
  socket.close();
 });

 timeoutRef.current = setTimeout(() => {
  setError('CONNECTION TIMEOUT. PLEASE TRY AGAIN.');
  setIsChecking(false);
  socket.close();
 }, 5000);
 };

 useEffect(() => {
 return () => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
 };
 }, []);

 return (
 <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 sm:p-8 relative overflow-hidden select-none font-sans">

  {/* ── Immersive Background ── */}
  <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center">
  <div className="fancy-text opacity-10 blur-[2px] select-none scale-150 sm:scale-100">JOIN</div>
  <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
  </div>

  <GridBackground movies={bgMovies} />

  {/* ── Main Layout ── */}
  <div className="relative z-10 w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
  
  {/* Left Side: Cinematic Branding */}
  <div className="hidden lg:flex flex-col gap-8 animate-fade-in-up">
   <div className="flex flex-col gap-2">
    <span className="text-red-600 font-black text-[12px] tracking-[0.5em] uppercase">Watch Together</span>
    <h1 className="text-[100px] font-black leading-[0.8] tracking-tighter text-left mx-0 max-w-none">SYNC<br/>PLAY</h1>
   </div>
   <p className="text-white/40 text-lg font-medium max-w-md leading-relaxed">
    Experience cinema as it was meant to be shared. Enter a room code to synchronize your playback with friends in real-time.
   </p>
   <div className="flex items-center gap-6 mt-4">
    <div className="flex -space-x-4">
     {[1,2,3,4].map(i => (
      <div key={i} className="w-12 h-12 border-2 border-black bg-white/10 flex items-center justify-center font-black text-xs">U{i}</div>
     ))}
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Join 20k+ Active Parties</span>
   </div>
  </div>

  {/* Right Side: Join Form */}
  <div className="w-full max-w-md mx-auto lg:mx-0 bg-white/[0.02] border border-white/10 p-10 sm:p-16 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
   <div className="flex flex-col gap-12">
    <div className="flex flex-col gap-4">
     <h2 className="text-4xl font-black uppercase tracking-tighter">Enter Party</h2>
     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Provide credentials to synchronize</p>
    </div>

    <div className="space-y-10">
     {/* Room Code */}
     <div className="space-y-4">
      <label className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20 ml-1 block">Room Identification</label>
      <input
       type="text"
       value={roomIdInput}
       onChange={(e) => setRoomIdInput(e.target.value)}
       onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
       placeholder="ROOM CODE..."
       className="w-full bg-white/5 border border-white/10 px-8 py-5 text-[11px] font-black uppercase tracking-[0.4em] text-white placeholder:text-white/10 focus:bg-white/[0.08] focus:border-white/20 transition-all outline-none"
      />
     </div>

     {/* Display Name */}
     <div className="space-y-4">
      <label className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20 ml-1 block">Personal Alias</label>
      <input
       type="text"
       value={userName}
       onChange={(e) => setUserName(e.target.value)}
       onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
       placeholder="YOUR NAME..."
       className="w-full bg-white/5 border border-white/10 px-8 py-5 text-[11px] font-black uppercase tracking-[0.4em] text-white placeholder:text-white/10 focus:bg-white/[0.08] focus:border-white/20 transition-all outline-none"
      />
     </div>

     {error && (
      <div className="bg-red-600/10 border border-red-600/20 px-6 py-4 animate-fade-in-up">
       <span className="text-red-500 text-[9px] font-black uppercase tracking-[0.3em] leading-tight block text-center">{error}</span>
      </div>
     )}

     <div className="pt-4 flex flex-col gap-6">
      <button
       onClick={handleJoin}
       disabled={isChecking}
       className="w-full py-6 bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 group"
      >
       {isChecking ? (
        <div className="w-4 h-4 border-2 border-white/20 border-t-white animate-spin" />
       ) : (
        <span className="group-hover:translate-x-1 transition-transform">INITIALIZE SYNC</span>
       )}
      </button>

      <button
       onClick={() => navigate(-1)}
       className="text-[9px] font-black uppercase tracking-[0.4em] text-white/20 hover:text-white transition-colors py-2"
      >
       ← Terminate Session
      </button>
     </div>
    </div>
   </div>
  </div>

  </div>
 </div>
 );
};

export default JoinRoom;
