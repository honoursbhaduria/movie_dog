import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const WatchTogetherButton = ({ movieId, type }) => {
 const navigate = useNavigate();
 const [isOpen, setIsOpen] = useState(false);
 const [name, setName] = useState('');

 const handleCreateRoom = (event) => {
 event.preventDefault();
 const trimmedName = name.trim();
 if (!trimmedName) return;
 const roomId = uuidv4().slice(0, 8);
 navigate(`/watch/${type}/${movieId}?room=${roomId}&name=${encodeURIComponent(trimmedName)}&creator=1`);
 };

 return (
 <>
  {/* ── Trigger Button ── */}
  <button
  onClick={() => setIsOpen(true)}
  className="bg-white/5 border border-white/10 flex items-center gap-2.5 px-5 py-2.5 text-sm font-semibold text-white/90 transition-all duration-300 hover:scale-[1.04] hover: hover: active:scale-95 cursor-pointer"
  >
  {/* Cinema / Users icon with pulse */}
  <span className="relative flex items-center justify-center">
   <span className="absolute inset-0 bg-white/10 animate-pulse" />
   <svg
   xmlns="http://www.w3.org/2000/svg"
   className="relative w-[18px] h-[18px] text-white/90"
   fill="none"
   viewBox="0 0 24 24"
   stroke="currentColor"
   strokeWidth={1.8}
   >
   <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M4 6.5h8a2.5 2.5 0 012.5 2.5v6a2.5 2.5 0 01-2.5 2.5H4A2.5 2.5 0 011.5 15V9A2.5 2.5 0 014 6.5z"
   />
   </svg>
  </span>
  Watch Together
  </button>

  {/* ── Modal Overlay ── */}
  {isOpen && (
  <div
   className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md"
   onClick={() => setIsOpen(false)}
  >
   {/* ── Card ── */}
   <div
   className="bg-white/5 border border-white/10 relative w-[92vw] max-w-sm px-7 py-8 animate-fade-in-up"
   onClick={(e) => e.stopPropagation()}
   >
   {/* Crown / Star icon */}
   <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-white/[0.07] ring-1 ring-white/10">
    <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6 text-amber-400"
    fill="currentColor"
    viewBox="0 0 24 24"
    >
    <path d="M12 2l2.09 6.26L20.18 9l-5 4.36L16.82 20 12 16.77 7.18 20l1.64-6.64L3.82 9l6.09-.74L12 2z" />
    </svg>
   </div>

   {/* Title */}
   <h2 className="text-center text-xl font-bold text-white tracking-tight">
    Create Watch Party
   </h2>

   {/* Subtitle */}
   <p className="mt-1.5 text-center text-sm text-white/50 leading-relaxed">
    You'll control the stream as the room owner
   </p>

   {/* Form */}
   <form onSubmit={handleCreateRoom} className="mt-6 space-y-5">
    {/* Display Name Input */}
    <div className="relative">
    <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
     <svg
     xmlns="http://www.w3.org/2000/svg"
     className="h-4 w-4 text-white/30"
     fill="none"
     viewBox="0 0 24 24"
     stroke="currentColor"
     strokeWidth={2}
     >
     <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
     />
     </svg>
    </div>
    <input
     type="text"
     value={name}
     onChange={(e) => setName(e.target.value)}
     placeholder="Display Name"
     autoFocus
     className="w-full border border-white/[0.08] bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-white placeholder-white/25 outline-none transition-all duration-200 focus:border-white/20 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10"
    />
    </div>

    {/* Action Buttons */}
    <div className="flex items-center gap-3">
    <button
     type="button"
     onClick={() => setIsOpen(false)}
     className="flex-1 border border-white/[0.08] py-2.5 text-sm font-medium text-white/50 transition-all duration-200 hover:bg-white/[0.05] hover:text-white/70 cursor-pointer"
    >
     Cancel
    </button>
    <button
     type="submit"
     className="flex-1 bg-white py-2.5 text-sm font-bold text-black transition-all duration-200 hover:bg-white/90 active:scale-[0.97] cursor-pointer"
    >
     Start Party
    </button>
    </div>
   </form>

   {/* Bottom Note */}
   <p className="mt-5 text-center text-[11px] text-white/25 tracking-wide">
    Share the room code with friends to join
   </p>
   </div>
  </div>
  )}
 </>
 );
};

export default WatchTogetherButton;
