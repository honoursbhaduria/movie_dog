import React from 'react';

const Navbar = ({ searchTerm, setSearchTerm, authUser, contentType, setContentType, aiMode, setAiMode, aiUsesLeft }) => {
 return (
 <nav className="navbar">
  <div className="flex items-center gap-6">
  <div className="relative group">
   <input 
   type="text"
   placeholder="Search"
   value={searchTerm}
   onChange={(e) => setSearchTerm(e.target.value)}
   className="bg-transparent outline-none text-white text-xs font-bold pl-8 w-40 placeholder:text-gray-500"
   />
   <svg className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-white transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
   <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
   </svg>
  </div>

  <div className="hidden lg:flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
   <span className="hover:text-white cursor-pointer transition-colors">New</span>
   <span className={`hover:text-white cursor-pointer transition-colors ${contentType === 'movie' ? 'text-white' : ''}`} onClick={() => setContentType('movie')}>Movies</span>
   <span className="hover:text-white cursor-pointer transition-colors">Cartoons</span>
  </div>
  </div>

  <div className="absolute left-1/2 -translate-x-1/2 text-3xl font-black text-white uppercase tracking-tighter cursor-pointer" onClick={() => window.location.reload()}>
  AGENCY
  </div>

  <div className="flex items-center gap-6">
  <div className="flex items-center gap-6 mr-2">
   <div className="relative cursor-pointer text-gray-500 hover:text-white transition-colors">
   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
   <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 border border-[#030014]" />
   </div>
  </div>

  <div className="flex items-center gap-4">
   <div className="flex items-center gap-3 cursor-pointer group">
   <div className="flex flex-col items-end hidden sm:flex">
    <span className="text-[10px] font-black text-white tracking-widest uppercase">{authUser?.name || 'Joâo M'}</span>
    <div className="w-1 h-1 bg-accent mt-0.5 " />
   </div>
   <div className="w-9 h-9 border border-white/10 overflow-hidden ">
    {authUser?.avatar ? (
    <img src={authUser.avatar} alt="Profile" className="w-full h-full object-cover" />
    ) : (
    <div className="w-full h-full bg-white/5 flex items-center justify-center text-white font-black text-xs">
     {(authUser?.name || 'J').charAt(0)}
    </div>
    )}
   </div>
   </div>
  </div>
  </div>
 </nav>
 );
};

export default Navbar;
