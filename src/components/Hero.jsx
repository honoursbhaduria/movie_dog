import React from 'react';

const Hero = ({ onCardClick }) => {
  const movies = [
    {
      id: 436270,
      title: 'Black Adam',
      poster: 'https://image.tmdb.org/t/p/w500/p9o4Yp2DqE99Y0Tnp9rP18vI6L3.jpg',
      class: 'hero-card--left'
    },
    {
      id: 493529,
      title: 'Dungeons & Dragons: Honor Among Thieves',
      poster: 'https://image.tmdb.org/t/p/w500/v79v9S9PBpsSI6RfvAnpFi9LnT2.jpg',
      class: 'hero-card--center'
    },
    {
      id: 829280,
      title: 'Enola Holmes 2',
      poster: 'https://image.tmdb.org/t/p/w500/tegBqCDZW76OUXm2U1B6CIzZp7K.jpg',
      class: 'hero-card--right'
    }
  ];

  return (
    <div className="hero-container">
      {movies.map((movie) => (
        <div 
          key={movie.id} 
          className={`hero-card ${movie.class}`}
          onClick={() => onCardClick && onCardClick(movie.id)}
        >
          <img src={movie.poster} alt={movie.title} loading="lazy" />
        </div>
      ))}
    </div>
  );
};

export default Hero;
