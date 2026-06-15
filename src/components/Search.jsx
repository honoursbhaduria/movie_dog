import React from 'react'

const Search = ({ 
 searchTerm, 
 setSearchTerm, 
 aiMode, 
 setAiMode, 
 aiUsesLeft,
 contentType,
 setContentType,
}) => {
 return (
 <div className="search-container mt-20 mb-10">
  <div className="flex items-center justify-between mb-10 px-12 md:px-32">
  <div className="flex bg-white/5 p-1 border border-white/10 backdrop-blur-md">
   <button 
   className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${contentType === 'movie' ? 'bg-white text-black ' : 'text-white/40 hover:text-white'}`}
   onClick={() => setContentType('movie')}
   >
   Movies
   </button>
   <button 
   className={`px-8 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${contentType === 'tv' ? 'bg-white text-black ' : 'text-white/40 hover:text-white'}`}
   onClick={() => setContentType('tv')}
   >
   Web Series
   </button>
  </div>

  <button
   type="button"
   className={`flex items-center gap-2 px-6 py-2.5 border transition-all ${aiMode ? 'bg-red-600 border-red-500 text-white ' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
   onClick={() => aiUsesLeft > 0 && setAiMode(v => !v)}
   disabled={aiUsesLeft <= 0 && !aiMode}
  >
   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
   <path d="M12 2l2.09 6.91L21 12l-6.91 2.09L12 21l-2.09-6.91L3 12l6.91-2.09L12 2z" />
   </svg>
   <span className="text-[10px] font-black uppercase tracking-widest">AI Search {aiUsesLeft > 0 ? `(${aiUsesLeft})` : '(0)'}</span>
  </button>
  </div>

  <div className="px-12 md:px-32 relative">
  <div className="absolute left-16 md:left-36 top-1/2 -translate-y-1/2 text-white/20">
   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  </div>
  <input
   type="text"
   placeholder={aiMode ? 'Describe your mood or the vibe you want...' : 'Search for titles, actors, or genres...'}
   value={searchTerm}
   onChange={(e) => setSearchTerm(e.target.value)}
   className="w-full bg-white/5 border border-white/10 backdrop-blur-3xl pl-16 pr-8 py-8 text-xl font-bold text-white placeholder:text-white/10 outline-none focus:border-white/20 transition-all "
  />
  </div>
 </div>
 )
}
export default Search
