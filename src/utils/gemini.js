// Gemini AI — movie recommendation engine
import { fetchWithCache } from './cache';
import { tmdbFetch } from './tmdb';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const aiCache = new Map();

/**
 * Get AI-powered movie recommendations based on user's favorites.
 *
 * @param {Array<{ title: string, vote_average?: number }>} favorites
 * @returns {Promise<Array<{ title: string, reason: string, year?: string, movie?: object }>>}
 */
export const getRecommendations = async (favorites) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn('Gemini API key not configured');
        return [];
    }

    if (!favorites || favorites.length === 0) return [];

    const movieList = favorites.map(f => f.title).join(', ');
    const cacheKey = `recs:${movieList}`;
    
    if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

    const prompt = `You are a senior film critic and recommendation engine. A user loves these movies: ${movieList}.

Based on their taste, recommend exactly 6 movies they haven't listed that they would love. Pick from a diverse range of genres, decades, and styles while staying true to their preferences.

For each recommendation, provide:
- title: the exact movie title
- year: release year
- reason: a single compelling sentence (max 20 words) explaining why they'll love it

Respond ONLY with a valid JSON array. No markdown, no extra text. Example:
[{"title":"Inception","year":"2010","reason":"Mind-bending thriller with the visual flair you clearly enjoy."}]`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: GEMINI_TEMPERATURE,
                    maxOutputTokens: 1024,
                },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Extract JSON from potential markdown code fences
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('Could not parse Gemini response:', text);
            return [];
        }

        const recs = JSON.parse(jsonMatch[0]);

        // Resolve each recommendation via TMDB search to get posters & IDs
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

        aiCache.set(cacheKey, resolved);
        return resolved;
    } catch (err) {
        const isNetworkError = err instanceof TypeError || (err.message && (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')));
        if (!isNetworkError) {
          console.error('Error getting Gemini recommendations:', err);
        }
        return [];
    }
};

/**
 * AI-powered movie filter — natural language → movie results.
 * e.g. "funny 90s action movies" or "dark sci-fi like Blade Runner"
 *
 * @param {string} query — natural language description
 * @param {string} contentType — 'movie' or 'tv'
 * @param {string} category — 'all', 'bollywood', 'hollywood', 'anime'
 * @returns {Promise<Array<object>>} — array of TMDB objects
 */
export const aiFilterMovies = async (query, contentType = 'movie', category = 'all') => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn('Gemini API key not configured');
        return [];
    }

    if (!query?.trim()) return [];
    
    const cacheKey = `filter:${contentType}:${category}:${query.trim().toLowerCase()}`;
    if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

    let categoryContext = '';
    if (category === 'bollywood') categoryContext = ' Focus on Indian/Bollywood cinema.';
    else if (category === 'hollywood') categoryContext = ' Focus on Hollywood/Western cinema.';
    else if (category === 'anime') categoryContext = ' Focus strictly on Japanese Anime (animation from Japan).';

    const prompt = `You are a ${contentType === 'tv' ? 'TV show' : 'movie'} search engine. The user described what they want to watch:
"${query}"
${categoryContext}

Return exactly 12 ${contentType === 'tv' ? 'TV show' : 'movie'} titles that best match this description. Focus on well-known, real titles. Consider genre, mood, era, actors, directors, themes, and style.

Respond ONLY with a valid JSON array of objects. No markdown, no extra text.
Format: [{"title":"Title Name","year":"2020"},{"title":"Another One","year":"1999"}]`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: GEMINI_TEMPERATURE,
                    maxOutputTokens: 512,
                },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 429) {
                throw new Error('Gemini rate limit reached. Wait a few seconds and try again.');
            }
            throw new Error(`Gemini API error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('Could not parse Gemini filter response:', text);
            return [];
        }

        const titles = JSON.parse(jsonMatch[0]);

        // Resolve each title via TMDB search in the correct category
        const results = await Promise.all(
            titles.slice(0, 12).map(async (item) => {
                try {
                    const data = await tmdbFetch(`/search/${contentType}`, {
                        query: item.title,
                        [contentType === 'movie' ? 'year' : 'first_air_date_year']: item.year || '',
                        page: '1'
                    });
                    return data.results?.[0] || null;
                } catch (err) {
                    return null;
                }
            })
        );

        const filteredResults = results.filter(Boolean);
        aiCache.set(cacheKey, filteredResults);
        return filteredResults;
    } catch (err) {
        const isNetworkError = err instanceof TypeError || (err.message && (err.message.includes('NetworkError') || err.message.includes('Failed to fetch')));
        if (!isNetworkError) {
          console.error('Error in AI filter:', err);
        }
        return [];
    }
};

/**
 * Get quick smart suggestions for search dropdown.
 */
export const getSmartSuggestions = async (query) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE' || !query?.trim()) return [];

    const cacheKey = `suggest:${query.trim().toLowerCase()}`;
    if (aiCache.has(cacheKey)) return aiCache.get(cacheKey);

    // Step 1: Try a quick TMDB prefix search first for high accuracy
    try {
        const tmdbData = await tmdbFetch('/search/multi', { query: query.trim(), page: '1' });
        const tmdbResults = tmdbData.results?.filter(r => r.media_type !== 'person').slice(0, 4) || [];
        
        // If we have strong prefix matches, return them immediately
        if (tmdbResults.length > 0 && (tmdbResults[0].title || tmdbResults[0].name).toLowerCase().startsWith(query.toLowerCase().slice(0, 3))) {
            aiCache.set(cacheKey, tmdbResults);
            return tmdbResults;
        }
    } catch (e) { /* ignore */ }

    // Step 2: Use AI for fuzzy/smart correction (e.g. "spidddermannn")
    const prompt = `User typed a search query: "${query}". 
If this looks like a typo or misspelled movie/TV title, identify the correct intended title.
Recommend exactly 4 real, popular movie or TV show titles that are either exact matches or highly relevant corrections.
Respond ONLY with a valid JSON array of strings (the titles).
Example: ["Inception", "Interstellar", "The Dark Knight", "The Prestige"]`;

    try {
        const response = await fetch(`${import.meta.env.VITE_GEMINI_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.1 } // Keep it deterministic
            }),
        });

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const titles = JSON.parse(text.match(/\[.*\]/)?.[0] || '[]');

        const results = await Promise.all(titles.slice(0, 4).map(async (t) => {
            const data = await tmdbFetch('/search/multi', { query: t, page: '1' });
            return data.results?.filter(r => r.media_type !== 'person')[0];
        }));

        const final = results.filter(Boolean);
        aiCache.set(cacheKey, final);
        return final;
    } catch (e) {
        return [];
    }
};
