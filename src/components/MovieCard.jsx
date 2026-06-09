import React, { memo } from 'react'
import { getTMDBImageUrl } from '../utils/image'

const MovieCard = memo(({ movie, onClick }) => {
  const { 
    title, 
    name, 
    vote_average, 
    poster_path, 
    release_date, 
    first_air_date, 
    original_language 
  } = movie;
  
  const displayTitle = title || name;
  const displayDate = (release_date || first_air_date || '').split('-')[0] || 'N/A';

  return (
    <div className="movie-card" onClick={onClick}>
      <img
        src={getTMDBImageUrl(poster_path, 'w500')}
        alt={displayTitle}
        loading="lazy"
      />

      <div className="mt-4">
        <h3>{displayTitle}</h3>

        <div className="content">
          <div className="rating">
            <img src="/star.svg" alt="Star Icon" />
            <p>{vote_average ? vote_average.toFixed(1) : 'N/A'}</p>
          </div>

          <span>•</span>
          <p className="lang">{original_language}</p>

          <span>•</span>
          <p className="year">
            {displayDate}
          </p>
        </div>
      </div>
    </div>
  )
});

MovieCard.displayName = 'MovieCard';

export default MovieCard
