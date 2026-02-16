import React from 'react'

const Search = ({ searchTerm, setSearchTerm, aiMode, setAiMode, aiUsesLeft }) => {
  return (
    <div className="search">
      <div>
        <img src="search.svg" alt="search" />

        <input
          type="text"
          placeholder={aiMode
            ? 'Describe what you want to watch...'
            : 'Search through thousands of movies'}
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
  )
}
export default Search
