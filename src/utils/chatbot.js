// AI Movie Chatbot — Gemini with Google Search grounding + TMDB resolution
import { fetchWithCache } from './cache';
import { tmdbFetch } from './tmdb';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_TEMPERATURE = parseFloat(import.meta.env.VITE_GEMINI_TEMPERATURE || '0.7');
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are MovieDog, an expert AI movie and TV show recommendation assistant. Keep replies SHORT (1-2 sentences max + movie list).

CRITICAL RULES:
1. You MUST ONLY discuss movies, TV shows, actors, directors, and cinema. 
2. If the user asks about ANY other topic (politics, history, programming, math, presidents, general knowledge, etc.), you MUST politely refuse and guide them back to movies. Example: "I only know about movies and TV shows! How about I recommend a good political thriller instead?"
3. When recommending, format your response strictly as follows:
   - A brief, engaging intro sentence.
   - A valid JSON array of exactly 4-6 recommendations at the end.
   - Format: [{"title":"Movie Title","year":"2020","reason":"Short reason why"}]
   - Do NOT include markdown code blocks for the JSON. Just put the [ array ] at the very end.`;

/**
 * Send a message to the Gemini-powered movie chatbot.
 * @param {Array} history - Previous messages
 * @param {string} userMessage - New user message
 */
export const sendChatMessage = async (history, userMessage) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        throw new Error('Gemini API key not configured');
    }

    const contents = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        ...history.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    try {
        // Attempt Gemini with Search Grounding
        const data = await callGemini(contents, true);
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Extract JSON array
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const recs = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        const cleanText = text.replace(/\[[\s\S]*\]/, '').trim();

        return {
            text: cleanText,
            recommendations: recs
        };
    } catch (err) {
        console.error('Chatbot error:', err);
        throw err;
    }
};

/**
 * Internal helper to call Gemini API
 */
const callGemini = async (contents, useSearch = false, retryCount = 0) => {
    const body = {
        contents,
        generationConfig: {
            temperature: GEMINI_TEMPERATURE,
            maxOutputTokens: 1024,
        }
    };

    // Add Google Search grounding if requested
    if (useSearch) {
        body.tools = [{ googleSearchRetrieval: {} }];
    }

    const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        if (response.status === 429) {
            // If using search, try without it first
            if (useSearch) {
                console.warn('Google Search grounding rate-limited, falling back to plain Gemini...');
                return callGemini(contents, false, 0);
            }
            // Retry once after a delay
            if (retryCount < 1) {
                console.warn('Rate-limited, retrying in 3 seconds...');
                await new Promise(r => setTimeout(r, 3000));
                return callGemini(contents, false, retryCount + 1);
            }
        }
        const errText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    return response.json();
};

/**
 * Resolve movie titles via TMDB search to get posters, ratings, IDs.
 */
export const resolveMovieTitles = async (recs) => {
    if (!recs || recs.length === 0) return [];

    const resolved = await Promise.all(
        recs.slice(0, 6).map(async (rec) => {
            try {
                const data = await tmdbFetch('/search/movie', {
                    query: rec.title,
                    year: rec.year || '',
                    page: '1'
                });
                const movie = data.results?.[0] || null;

                return {
                    ...rec,
                    movie, // full TMDB movie object (or null)
                };
            } catch (err) {
                return { ...rec, movie: null };
            }
        })
    );

    return resolved.filter(Boolean);
};
