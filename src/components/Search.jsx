import React from 'react'

const Search = ({ 
  searchTerm, 
  setSearchTerm, 
  aiMode, 
  setAiMode, 
  aiUsesLeft,
  contentType,
  setContentType,
  category,
  setCategory,
  language,
  setLanguage,
  isStreamingUnlocked
}) => {
  return (
    <div className="search-container">
      <div className="search">
        <div>
          <img src="search.svg" alt="search" />

          <input
            type="text"
            placeholder={aiMode
              ? 'Describe what you want to watch...'
              : `Search through thousands of ${contentType === 'movie' ? 'movies' : 'web series'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button
            type="button"
            className={`ai-toggle${aiMode ? ' ai-toggle--active' : ''}${aiUsesLeft <= 0 ? ' ai-toggle--disabled' : ''}`}
            onClick={() => aiUsesLeft > 0 && setAiMode(v => !v)}
            title={aiUsesLeft <= 0
              ? 'AI searches exhausted'
              : aiMode ? 'Switch to normal search' : 'Switch to AI search'}
            disabled={aiUsesLeft <= 0 && !aiMode}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l2.09 6.91L21 12l-6.91 2.09L12 21l-2.09-6.91L3 12l6.91-2.09L12 2z" />
            </svg>
            AI {aiUsesLeft > 0 ? `(${aiUsesLeft})` : '(0)'}
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <button 
            className={`filter-btn ${contentType === 'movie' ? 'active' : ''}`}
            onClick={() => setContentType('movie')}
          >
            Movies
          </button>
          <button 
            className={`filter-btn ${contentType === 'tv' ? 'active' : ''}`}
            onClick={() => setContentType('tv')}
          >
            Web Series
          </button>
        </div>

        <div className="filter-group">
          <button 
            className={`filter-btn ${category === 'all' ? 'active' : ''}`}
            onClick={() => setCategory('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${category === 'bollywood' ? 'active' : ''}`}
            onClick={() => setCategory('bollywood')}
          >
            Bollywood
          </button>
          <button 
            className={`filter-btn ${category === 'hollywood' ? 'active' : ''}`}
            onClick={() => setCategory('hollywood')}
          >
            Hollywood
          </button>
          {isStreamingUnlocked && (
            <button 
              className={`filter-btn ${category === 'anime' ? 'active' : ''}`}
              onClick={() => setCategory('anime')}
            >
              Anime
            </button>
          )}
        </div>

        <div className="filter-group">
          <select 
            className="filter-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </div>
      </div>
    </div>
  )
}
export default Search
