import React from 'react';

const Tabs = ({ activeTab, onTabChange, activePill, onPillChange }) => {
 const tabs = ['Trending', 'Popular', 'Webseries', 'Recently added', 'Premium'];
 const pills = ['All', 'Action', 'Adventure', 'Animation', 'Fiction', 'Heroes', 'Comedy', 'Anime'];

 return (
 <div className="tabs-container mt-20 mb-12 px-12 md:px-32">
  <div className="flex items-center justify-between border-b border-white/5 mb-10">
  <div className="flex gap-12">
   {tabs.map((tab) => (
   <div 
    key={tab} 
    className={`tab-item pb-4 text-[10px] font-black uppercase tracking-[0.4em] cursor-pointer transition-all relative ${activeTab === tab ? 'text-white' : 'text-white/20 hover:text-white/60'}`}
    onClick={() => onTabChange(tab)}
   >
    {tab}
    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 " />}
   </div>
   ))}
  </div>
  </div>

  <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
  {pills.map((pill) => (
   <div 
   key={pill} 
   className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activePill === pill ? 'bg-white text-black scale-105' : 'bg-white/5 border border-white/10 text-white/40 hover:text-white'}`}
   onClick={() => onPillChange(pill)}
   >
   {pill}
   </div>
  ))}
  </div>
 </div>
 );
};

export default Tabs;
