import React, { useEffect, useRef, useState } from 'react';

const ChatPanel = ({ messages, users, onSendMessage, onUpdateName, currentUser }) => {
 const [inputText, setInputText] = useState('');
 const [isEditingName, setIsEditingName] = useState(false);
 const [tempName, setTempName] = useState(currentUser);
 const scrollRef = useRef(null);

 useEffect(() => {
 if (scrollRef.current) {
  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
 }
 }, [messages]);

 const handleSubmit = (e) => {
 e.preventDefault();
 if (inputText.trim()) {
  onSendMessage(inputText);
  setInputText('');
 }
 };

 const handleNameUpdate = (e) => {
 e.preventDefault();
 if (tempName.trim()) {
  onUpdateName(tempName);
  setIsEditingName(false);
 }
 };

 /* tiny helper — deterministic hue from a string */
 const nameHue = (name) => {
 let h = 0;
 for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
 return Math.abs(h) % 360;
 };

 return (
 <div className="w-80 flex flex-col h-full bg-black/40 backdrop-blur-xl border-l border-white/[0.06]">

  {/* ── Header ────────────────────────────────────── */}
  <div className="px-5 pt-5 pb-4 border-b border-white/[0.06]">

  {/* Title row */}
  <div className="flex items-center justify-between mb-3">
   <div className="flex items-center gap-2">
   {/* pulsing live dot */}
   <span className="relative flex h-2 w-2">
    <span className="animate-ping absolute inline-flex h-full w-full bg-red-500 opacity-75" />
    <span className="relative inline-flex h-2 w-2 bg-red-500" />
   </span>
   <h3 className="text-xs font-semibold text-white/90 tracking-wide">Live Chat</h3>
   </div>

   <span className="text-[10px] font-medium text-white/30 bg-white/[0.04] px-2.5 py-0.5 border border-white/[0.06]">
   {users.length} watching
   </span>
  </div>

  {/* User pills + edit toggle */}
  <div className="flex items-center gap-2 flex-wrap">
   {!isEditingName && users.map((name, i) => (
   <span
    key={i}
    className={`px-2.5 py-[3px] text-[9px] font-semibold uppercase tracking-wider transition-all
    ${name === currentUser
     ? 'bg-gradient-to-r from-red-600 to-red-700 text-white 
     : 'bg-white/[0.05] text-white/40 border border-white/[0.06]'
    }`}
   >
    {name}
   </span>
   ))}

   {/* pencil / cancel toggle */}
   <button
   onClick={() => { setIsEditingName(!isEditingName); setTempName(currentUser); }}
   className="ml-auto flex items-center justify-center h-6 w-6 bg-white/[0.05] border border-white/[0.08] text-white/30 hover:text-white/70 hover:bg-white/[0.1] transition-all"
   title={isEditingName ? 'Cancel' : 'Change Name'}
   >
   {isEditingName ? (
    /* X icon */
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
   ) : (
    /* pencil icon */
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
   )}
   </button>
  </div>

  {/* Inline name editor */}
  {isEditingName && (
   <form onSubmit={handleNameUpdate} className="mt-3 flex gap-2">
   <input
    type="text"
    value={tempName}
    onChange={(e) => setTempName(e.target.value)}
    className="flex-1 bg-white/[0.06] border border-white/[0.1] px-4 py-1.5 text-[11px] font-medium text-white outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/20"
    placeholder="New name…"
    autoFocus
   />
   <button
    type="submit"
    className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-[10px] font-semibold text-white hover:opacity-90 transition-opacity"
   >
    Save
   </button>
   </form>
  )}
  </div>

  {/* ── Messages Area ─────────────────────────────── */}
  <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
  {messages.map((msg, i) => (
   <div key={i} className={`flex flex-col ${msg.type === 'system' ? 'items-center' : ''}`}>
   {msg.type === 'system' ? (
    /* System message — centred, subtle divider feel */
    <div className="flex items-center gap-3 py-1 w-full">
    <span className="flex-1 h-px bg-gradient-to-r from-transparent to-white/[0.06]" />
    <p className="text-[9px] font-medium italic text-white/20 tracking-wide whitespace-nowrap">
     {msg.text}
    </p>
    <span className="flex-1 h-px bg-gradient-to-l from-transparent to-white/[0.06]" />
    </div>
   ) : (
    /* User message */
    <div className="flex gap-2.5 items-start group">
    {/* Avatar circle */}
    <div
     className="flex-shrink-0 h-7 w-7 flex items-center justify-center text-[10px] font-bold uppercase text-white/90 "
     style={{ backgroundColor: `hsl(${nameHue(msg.name)}, 50%, 35%)` }}
    >
     {msg.name.charAt(0)}
    </div>

    <div className="flex-1 min-w-0 space-y-1">
     {/* Name + timestamp */}
     <div className="flex items-baseline gap-2">
     <span className={`text-[11px] font-semibold tracking-wide ${msg.name === currentUser ? 'text-violet-300' : 'text-white/70'}`}>
      {msg.name}
     </span>
     <span className="text-[9px] text-white/15 font-medium tabular-nums">
      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
     </span>
     </div>

     {/* Bubble */}
     <p
     className={`text-[12.5px] leading-relaxed text-white/80 font-normal px-3.5 py-2 -tl-md border transition-colors
      ${msg.name === currentUser
      ? 'bg-violet-500/[0.08] border-violet-500/[0.1]'
      : 'bg-white/[0.04] border-white/[0.06]'
      }`}
     >
     {msg.text}
     </p>
    </div>
    </div>
   )}
   </div>
  ))}
  </div>

  {/* ── Input Bar ─────────────────────────────────── */}
  <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-white/[0.06]">
  <div className="relative flex items-center">
   <input
   type="text"
   value={inputText}
   onChange={(e) => setInputText(e.target.value)}
   placeholder="Say something..."
   className="w-full bg-white/[0.05] border border-white/[0.08] pl-5 pr-12 py-2.5 text-[12px] font-medium text-white outline-none focus:bg-white/[0.08] focus:border-white/[0.12] transition-all placeholder:text-white/20"
   />
   <button
   type="submit"
   className="absolute right-1.5 flex items-center justify-center h-7 w-7 bg-gradient-to-br from-red-600 to-red-700 text-white hover:opacity-90 active:scale-95 transition-all "
   >
   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
   </svg>
   </button>
  </div>
  </form>
 </div>
 );
};

export default ChatPanel;
