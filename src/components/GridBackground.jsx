import React, { useEffect, useState, useRef } from 'react';
import { getTMDBImageUrl } from '../utils/image';

const GridBackground = ({ movies = [] }) => {
 const [cells, setCells] = useState([]);
 const gridRef = useRef(null);
 const [gridSize, setGridSize] = useState({ cols: 15, rows: 8 });

 useEffect(() => {
 const updateGridSize = () => {
  const width = window.innerWidth;
  if (width < 768) {
  setGridSize({ cols: 8, rows: 12 });
  } else {
  setGridSize({ cols: 15, rows: 8 });
  }
 };

 updateGridSize();
 window.addEventListener('resize', updateGridSize);
 return () => window.removeEventListener('resize', updateGridSize);
 }, []);

 useEffect(() => {
 if (movies.length === 0) return;

 const total = gridSize.cols * gridSize.rows;
 const directions = ['slide-up', 'slide-down', 'slide-left', 'slide-right'];

 const newCells = Array.from({ length: total }, (_, i) => ({
  id: i,
  dir: directions[Math.floor(Math.random() * directions.length)],
  img: getTMDBImageUrl(movies[Math.floor(Math.random() * movies.length)].poster_path, 'w185'),
 }));

 setCells(newCells);
 }, [movies, gridSize]);

 useEffect(() => {
 const grid = gridRef.current;
 if (!grid) return;

 const handleMouseOver = (e) => {
  const cell = e.target.closest('.interactive-grid-cell');
  if (!cell) return;

  if (cell.classList.contains('revealed')) return;
  
  const index = parseInt(cell.dataset.index);
  
  // Reveal main cell
  cell.classList.add('revealed');
  setTimeout(() => cell.classList.remove('revealed'), 1200);
  
  // Wave effect: Reveal neighbors with staggered delays
  const neighborConfig = [
  { idx: index - 1, delay: 50 },
  { idx: index + 1, delay: 50 },
  { idx: index - gridSize.cols, delay: 50 },
  { idx: index + gridSize.cols, delay: 50 },
  { idx: index - gridSize.cols - 1, delay: 100 },
  { idx: index - gridSize.cols + 1, delay: 100 },
  { idx: index + gridSize.cols - 1, delay: 100 },
  { idx: index + gridSize.cols + 1, delay: 100 }
  ];
  
  neighborConfig.forEach(config => {
  if (config.idx >= 0 && config.idx < cells.length) {
   const nCell = grid.children[config.idx];
   if (nCell && !nCell.classList.contains('revealed') && !nCell.classList.contains('revealed-neighbor')) {
    setTimeout(() => {
    nCell.classList.add('revealed-neighbor');
    setTimeout(() => nCell.classList.remove('revealed-neighbor'), 1000);
    }, config.delay);
   }
  }
  });
 };

 grid.addEventListener('mouseover', handleMouseOver);
 return () => grid.removeEventListener('mouseover', handleMouseOver);
 }, [cells, gridSize.cols]);

 useEffect(() => {
 if (cells.length === 0) return;

 const interval = setInterval(() => {
  const count = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
  const idx = Math.floor(Math.random() * cells.length);
  const grid = gridRef.current;
  if (grid && grid.children[idx]) {
   const cell = grid.children[idx];
   if (!cell.classList.contains('revealed')) {
   cell.classList.add('revealed-neighbor');
   setTimeout(() => cell.classList.remove('revealed-neighbor'), 2500);
   }
  }
  }
 }, 2000);

 return () => clearInterval(interval);
 }, [cells]);

 if (movies.length === 0) return null;

 return (
 <div 
  ref={gridRef}
  className="interactive-grid-container fixed inset-0 z-[1] pointer-events-none opacity-40"
  style={{
  display: 'grid',
  gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
  gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
  gap: '4px',
  padding: '4px'
  }}
 >
  {cells.map((cell, idx) => (
  <div 
   key={`${cell.id}-${gridSize.cols}`} 
   data-index={idx}
   className="interactive-grid-cell relative overflow-hidden bg-white/[0.005] transition-colors duration-1000 pointer-events-auto"
   data-dir={cell.dir}
  >
   <img 
   src={cell.img} 
   alt="" 
   className="grid-cell-img absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
   />
  </div>
  ))}
 </div>
 );
};

export default GridBackground;
