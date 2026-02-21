import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../utils/chatbot';

const MAX_MESSAGES = 10; // max prompts per session

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

    // Persist to localStorage whenever messages or usesLeft change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            messages,
            history: historyRef.current,
            usesLeft,
        }));
    }, [messages, usesLeft]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Focus input when panel opens
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
                text: "You've reached the message limit for this session. Clear the chat to start a new session! 🔄",
                movies: [],
                id: Date.now(),
            }]);
            return;
        }

        // Add user message
        const userMsg = { role: 'user', text, id: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const { reply, movies } = await sendChatMessage(historyRef.current, text);

            // Update history for context
            historyRef.current.push({ role: 'user', text });
            historyRef.current.push({ role: 'model', text: reply });

            // Keep history manageable (last 20 turns)
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
                text: 'Sorry, something went wrong. Please try again! 🎬',
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
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="chatbot-backdrop" onClick={onClose} />

            {/* Panel */}
            <div className="chatbot-panel">
                {/* Header */}
                <div className="chatbot-header">
                    <div className="chatbot-header-left">
                        <img src="/logo.png" alt="MovieBot" className="chatbot-header-logo" />
                        <div>
                            <h3>MovieDog AI</h3>
                            <span className="chatbot-status">Sniffing Out the Best Films</span>
                        </div>
                    </div>
                    <div className="chatbot-header-actions">
                        {messages.length > 0 && (
                            <button className="chatbot-clear-btn" onClick={handleClearChat} title="Clear chat">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                            </button>
                        )}
                        <button className="chatbot-close-btn" onClick={onClose}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="chatbot-messages">
                    {messages.length === 0 && (
                        <div className="chatbot-welcome">
                            <img src="/logo.png" alt="MovieDog" className="chatbot-welcome-logo" />
                            <h3>Hey! I'm MovieDog</h3>
                            <p>Tell me what vibe you're going for and I'll sniff out the perfect movies for you. No cap 🎬</p>
                            <p className="chatbot-welcome-hint">Drop a mood, genre, or a movie you vibed with!</p>

                        </div>
                    )}

                    {messages.map((msg) => (
                        <div key={msg.id} className={`chatbot-msg chatbot-msg--${msg.role}`}>
                            {msg.role === 'ai' && (
                                <img src="/logo.png" alt="" className="chatbot-msg-avatar-img" />
                            )}
                            <div className="chatbot-msg-content">
                                <div className="chatbot-msg-text">{msg.text}</div>

                                {/* Movie cards */}
                                {msg.movies && msg.movies.length > 0 && (
                                    <div className="chatbot-movies-grid">
                                        {msg.movies.map((movie) => (
                                            <div
                                                key={movie.id}
                                                className="chatbot-movie-card"
                                                onClick={() => onMovieClick && onMovieClick(movie)}
                                            >
                                                <div className="chatbot-movie-poster">
                                                    {movie.poster_path ? (
                                                        <img
                                                            src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
                                                            alt={movie.title}
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="chatbot-movie-no-poster">🎬</div>
                                                    )}
                                                    <div className="chatbot-movie-rating">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFD700">
                                                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                                        </svg>
                                                        {movie.vote_average?.toFixed(1) || 'N/A'}
                                                    </div>
                                                </div>
                                                <div className="chatbot-movie-info">
                                                    <span className="chatbot-movie-title">{movie.title}</span>
                                                    <span className="chatbot-movie-year">
                                                        {movie.release_date?.split('-')[0] || ''}
                                                    </span>
                                                </div>
                                                {movie._reason && (
                                                    <p className="chatbot-movie-reason">{movie._reason}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {isTyping && (
                        <div className="chatbot-msg chatbot-msg--ai">
                            <img src="/logo.png" alt="" className="chatbot-msg-avatar-img" />
                            <div className="chatbot-msg-content">
                                <div className="chatbot-typing">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chatbot-input-area">
                    <div className="chatbot-input-wrap">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={usesLeft > 0 ? "Describe what you want to watch..." : "Message limit reached — clear chat to reset"}
                            disabled={isTyping || usesLeft <= 0}
                        />
                        <button
                            className="chatbot-send-btn"
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping || usesLeft <= 0}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        </button>
                    </div>
                    <div className="chatbot-uses-left">
                        {usesLeft} / {MAX_MESSAGES} messages left
                        <div className="chatbot-browser-note">Chat saved in this browser only</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AIChatbot;
