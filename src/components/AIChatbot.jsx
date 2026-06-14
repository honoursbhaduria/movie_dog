import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../utils/chatbot';

const MAX_MESSAGES = 10;
const STORAGE_KEY = 'moviedog_chat';

const loadSaved = () => {
 try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved) return saved;
 } catch { /* ignore */ }
 return { messages: [], history: [], usesLeft: MAX_MESSAGES };
};

const AIChatbot = ({ isOpen, onClose, onMovieClick }) => {
 const saved = loadSaved();
 const [messages, setMessages] = useState(saved.messages);
 const [input, setInput] = useState('');
 const [isTyping, setIsTyping] = useState(false);
 const [usesLeft, setUsesLeft] = useState(saved.usesLeft);
 const messagesEndRef = useRef(null);
 const inputRef = useRef(null);
 const historyRef = useRef(saved.history);

 useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
   messages,
   history: historyRef.current,
   usesLeft,
  }));
 }, [messages, usesLeft]);

 useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [messages, isTyping]);

 useEffect(() => {
  if (isOpen) {
   setTimeout(() => inputRef.current?.focus(), 300);
  }
 }, [isOpen]);

 const handleSend = async () => {
  const text = input.trim();
  if (!text || isTyping) return;

  if (usesLeft <= 0) {
   setMessages(prev => [...prev, {
    role: 'ai',
    text: "You've reached the message limit for this session. Clear the chat to start a new session.",
    movies: [],
    id: Date.now(),
   }]);
   return;
  }

  const userMsg = { role: 'user', text, id: Date.now() };
  setMessages(prev => [...prev, userMsg]);
  setInput('');
  setIsTyping(true);

  try {
   const { reply, movies } = await sendChatMessage(historyRef.current, text);

   historyRef.current.push({ role: 'user', text });
   historyRef.current.push({ role: 'model', text: reply });

   if (historyRef.current.length > 40) {
    historyRef.current = historyRef.current.slice(-40);
   }

   const aiMsg = {
    role: 'ai',
    text: reply,
    movies: movies || [],
    id: Date.now() + 1,
   };
   setMessages(prev => [...prev, aiMsg]);
   setUsesLeft(prev => prev - 1);
  } catch (err) {
   const errMsg = {
    role: 'ai',
    text: 'Search failed. Please try again.',
    movies: [],
    id: Date.now() + 1,
   };
   setMessages(prev => [...prev, errMsg]);
  } finally {
   setIsTyping(false);
  }
 };

 const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
   e.preventDefault();
   handleSend();
  }
 };

 const handleClearChat = () => {
  setMessages([]);
  historyRef.current = [];
  setUsesLeft(MAX_MESSAGES);
 };

 if (!isOpen) return null;

 return (
  <>
   {/* Subtle backdrop so the background is still completely visible */}
   <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-[4px]" onClick={onClose} />

   {/* Compact Floating Side Panel */}
   <div className="fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#0A0A0A] border-l border-white/5 z-[501] animate-slide-right-in-drawer">
    
    {/* Clean Header */}
    <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
     <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-accent flex items-center justify-center ">
       <svg width="20" height="20" viewBox="0 0 32 32" fill="#000">
        <path d="M13.961 22.279c0.246-0.273 0.601-0.444 0.995-0.444 0.739 0 1.338 0.599 1.338 1.338 0 0.016-0 0.032-0.001 0.048l0-0.002-0.237 6.483c-0.027 0.719-0.616 1.293-1.34 1.293-0.077 0-0.153-0.006-0.226-0.019l0.008 0.001c-1.763-0.303-3.331-0.962-4.69-1.902l0.039 0.025c-0.351-0.245-0.578-0.647-0.578-1.102 0-0.346 0.131-0.661 0.346-0.898l-0.001 0.001 4.345-4.829zM12.853 20.434l-6.301 1.572c-0.097 0.025-0.208 0.039-0.322 0.039-0.687 0-1.253-0.517-1.332-1.183l-0.001-0.006c-0.046-0.389-0.073-0.839-0.073-1.295 0-1.324 0.223-2.597 0.635-3.781l-0.024 0.081c0.183-0.534 0.681-0.911 1.267-0.911 0.214 0 0.417 0.050 0.596 0.14l-0.008-0.004 5.833 2.848c0.45 0.221 0.754 0.677 0.754 1.203 0 0.623-0.427 1.147-1.004 1.294l-0.009 0.002zM13.924 15.223l-6.104-10.574c-0.112-0.191-0.178-0.421-0.178-0.667 0-0.529 0.307-0.987 0.752-1.204l0.008-0.003c1.918-0.938 4.153-1.568 6.511-1.761l0.067-0.004c0.031-0.003 0.067-0.004 0.104-0.004 0.738 0 1.337 0.599 1.337 1.337 0 0.001 0 0.001 0 0.002v-0 12.207c-0 0.739-0.599 1.338-1.338 1.338-0.493 0-0.923-0.266-1.155-0.663l-0.003-0.006zM19.918 20.681l6.176 2.007c0.541 0.18 0.925 0.682 0.925 1.274 0 0.209-0.048 0.407-0.134 0.584l0.003-0.008c-0.758 1.569-1.799 2.889-3.068 3.945l-0.019 0.015c-0.23 0.19-0.527 0.306-0.852 0.306-0.477 0-0.896-0.249-1.134-0.625l-0.003-0.006-3.449-5.51c-0.128-0.201-0.203-0.446-0.203-0.709 0-0.738 0.598-1.336 1.336-1.336 0.147 0 0.289 0.024 0.421 0.068l-0.009-0.003zM26.197 16.742l-6.242 1.791c-0.11 0.033-0.237 0.052-0.368 0.052-0.737 0-1.335-0.598-1.335-1.335 0-0.282 0.087-0.543 0.236-0.758l-0.003 0.004 3.63-5.383c0.244-0.358 0.65-0.59 1.111-0.59 0.339 0 0.649 0.126 0.885 0.334l-0.001-0.001c1.25 1.104 2.25 2.459 2.925 3.99l0.029 0.073c0.070 0.158 0.111 0.342 0.111 0.535 0 0.608-0.405 1.121-0.959 1.286l-0.009 0.002z"></path>
       </svg>
      </div>
      <div>
       <h2 className="text-white font-bold text-lg leading-tight">AI Assistant</h2>
       <p className="text-gray-400 text-xs">Movie & TV Discovery</p>
      </div>
     </div>
     <div className="flex items-center gap-2">
      {messages.length > 0 && (
       <button 
        onClick={handleClearChat}
        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        title="Clear Chat"
       >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
        </svg>
       </button>
      )}
      <button 
       onClick={onClose}
       className="w-8 h-8 flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
       title="Close"
      >
       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
       </svg>
      </button>
     </div>
    </div>

    {/* Chat Area */}
    <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar space-y-6">
     {messages.length === 0 && (
      <div className="flex flex-col h-full items-center justify-center text-center space-y-4">
       <div className="w-16 h-16 bg-white/5 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" className="text-gray-400">
         <path d="M13.961 22.279c0.246-0.273 0.601-0.444 0.995-0.444 0.739 0 1.338 0.599 1.338 1.338 0 0.016-0 0.032-0.001 0.048l0-0.002-0.237 6.483c-0.027 0.719-0.616 1.293-1.34 1.293-0.077 0-0.153-0.006-0.226-0.019l0.008 0.001c-1.763-0.303-3.331-0.962-4.69-1.902l0.039 0.025c-0.351-0.245-0.578-0.647-0.578-1.102 0-0.346 0.131-0.661 0.346-0.898l-0.001 0.001 4.345-4.829zM12.853 20.434l-6.301 1.572c-0.097 0.025-0.208 0.039-0.322 0.039-0.687 0-1.253-0.517-1.332-1.183l-0.001-0.006c-0.046-0.389-0.073-0.839-0.073-1.295 0-1.324 0.223-2.597 0.635-3.781l-0.024 0.081c0.183-0.534 0.681-0.911 1.267-0.911 0.214 0 0.417 0.050 0.596 0.14l-0.008-0.004 5.833 2.848c0.45 0.221 0.754 0.677 0.754 1.203 0 0.623-0.427 1.147-1.004 1.294l-0.009 0.002zM13.924 15.223l-6.104-10.574c-0.112-0.191-0.178-0.421-0.178-0.667 0-0.529 0.307-0.987 0.752-1.204l0.008-0.003c1.918-0.938 4.153-1.568 6.511-1.761l0.067-0.004c0.031-0.003 0.067-0.004 0.104-0.004 0.738 0 1.337 0.599 1.337 1.337 0 0.001 0 0.001 0 0.002v-0 12.207c-0 0.739-0.599 1.338-1.338 1.338-0.493 0-0.923-0.266-1.155-0.663l-0.003-0.006zM19.918 20.681l6.176 2.007c0.541 0.18 0.925 0.682 0.925 1.274 0 0.209-0.048 0.407-0.134 0.584l0.003-0.008c-0.758 1.569-1.799 2.889-3.068 3.945l-0.019 0.015c-0.23 0.19-0.527 0.306-0.852 0.306-0.477 0-0.896-0.249-1.134-0.625l-0.003-0.006-3.449-5.51c-0.128-0.201-0.203-0.446-0.203-0.709 0-0.738 0.598-1.336 1.336-1.336 0.147 0 0.289 0.024 0.421 0.068l-0.009-0.003zM26.197 16.742l-6.242 1.791c-0.11 0.033-0.237 0.052-0.368 0.052-0.737 0-1.335-0.598-1.335-1.335 0-0.282 0.087-0.543 0.236-0.758l-0.003 0.004 3.63-5.383c0.244-0.358 0.65-0.59 1.111-0.59 0.339 0 0.649 0.126 0.885 0.334l-0.001-0.001c1.25 1.104 2.25 2.459 2.925 3.99l0.029 0.073c0.070 0.158 0.111 0.342 0.111 0.535 0 0.608-0.405 1.121-0.959 1.286l-0.009 0.002z" />
        </svg>
       </div>
       <h3 className="text-xl font-bold text-white">How can I help?</h3>
       <p className="text-sm text-gray-500 max-w-[250px]">
        Ask for movie recommendations, actors, or specific genres you're in the mood for.
       </p>
      </div>
     )}

     {messages.map((msg) => (
      <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
       <div className={`px-4 py-3 max-w-[85%] text-sm leading-relaxed ${
        msg.role === 'user' 
        ? 'bg-white text-black font-medium -tr-sm' 
        : 'bg-white/5 border border-white/5 text-gray-200 -tl-sm'
       }`}>
        {msg.text}
       </div>

       {/* Movie List inline */}
       {msg.movies && msg.movies.length > 0 && (
        <div className="flex flex-col gap-3 w-full mt-2">
         {msg.movies.map((movie) => (
          <div
           key={movie.id}
           className="flex items-center gap-4 bg-white/5 border border-white/5 p-3 cursor-pointer hover:bg-white/10 transition-colors"
           onClick={() => onMovieClick && onMovieClick(movie)}
          >
           <div className="w-12 h-16 overflow-hidden bg-black/50 shrink-0">
            {movie.poster_path ? (
             <img
              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
              alt={movie.title}
              className="w-full h-full object-cover"
             />
            ) : (
             <div className="w-full h-full flex items-center justify-center text-[10px]">🎬</div>
            )}
           </div>
           <div className="flex-1 min-w-0">
            <h4 className="text-white text-sm font-bold truncate">{movie.title}</h4>
            <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] text-gray-400 border border-white/10 px-2 py-0.5 ">
              {movie.release_date?.split('-')[0] || 'N/A'}
             </span>
             <span className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
               <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              {movie.vote_average?.toFixed(1) || 'N/A'}
             </span>
            </div>
           </div>
          </div>
         ))}
        </div>
       )}
      </div>
     ))}

     {isTyping && (
      <div className="flex items-start">
       <div className="bg-white/5 border border-white/5 px-4 py-4 -tl-sm flex gap-1.5 items-center">
        <span className="w-1.5 h-1.5 bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
       </div>
      </div>
     )}

     <div ref={messagesEndRef} />
    </div>

    {/* Input Area */}
    <div className="p-4 border-t border-white/5 bg-[#0A0A0A]/80">
     <div className="relative flex items-center bg-white/5 border border-white/10 px-2 py-1 focus-within:border-white/30 transition-colors">
      <input
       ref={inputRef}
       type="text"
       value={input}
       onChange={(e) => setInput(e.target.value)}
       onKeyDown={handleKeyDown}
       placeholder={usesLeft > 0 ? "Ask for recommendations..." : "Limit reached. Clear chat."}
       disabled={isTyping || usesLeft <= 0}
       className="flex-1 bg-transparent px-4 py-2 text-white outline-none placeholder:text-gray-500 text-sm"
      />
      <button
       onClick={handleSend}
       disabled={!input.trim() || isTyping || usesLeft <= 0}
       className="w-8 h-8 flex items-center justify-center text-black bg-white disabled:bg-white/10 disabled:text-white/20 transition-colors hover:scale-105 active:scale-95"
      >
       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
       </svg>
      </button>
     </div>
     <div className="mt-2 text-center">
      <p className="text-[10px] text-gray-500">
       {usesLeft} prompts remaining
      </p>
     </div>
    </div>
   </div>
  </>
 );
};

export default AIChatbot;
