import React, { useState, useCallback } from 'react';
import { getTMDBImageUrl } from '../utils/image';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const Sidebar = ({ onWishlistToggle }) => {
 const navigate = useNavigate();

 const handleSidebarWatchTogether = () => {
 // Generate a room for a popular movie (e.g. Mortal Kombat II)
 const roomId = uuidv4().slice(0, 8);
 navigate(`/watch/movie/1311031?room=${roomId}`);
 };

 return (
 <aside className="sidebar z-[100]">
  <div className="flex flex-col items-center gap-10">
  <div className="sidebar-icon active" onClick={() => navigate('/')}>
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>
  <div className="sidebar-icon" onClick={() => navigate('/join')} title="Join Watch Party">
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  </div>
  <div className="sidebar-icon" onClick={onWishlistToggle} title="My Favorites">
   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  </div>
  </div>
 </aside>
 );
};

export default Sidebar;
