// Gemini 2.5 Flash — movie recommendation engine

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_OPTIONS = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: `Bearer ${TMDB_API_KEY}`,
    },
};

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
                    temperature: 0.9,
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
                    const query = encodeURIComponent(rec.title);
                    const yearParam = rec.year ? `&year=${rec.year}` : '';
                    const res = await fetch(
                        `https://api.themoviedb.org/3/search/movie?query=${query}${yearParam}&page=1`,
                        TMDB_OPTIONS
                    );
                    const data = await res.json();
                    const movie = data.results?.[0] || null;

                    return {
                        ...rec,
                        movie, // full TMDB movie object (or null)
                    };
                } catch {
                    return { ...rec, movie: null };
                }
            })
        );

        return resolved;
    } catch (err) {
        console.error('Error getting Gemini recommendations:', err);
        return [];
    }
};

/**
 * AI-powered movie filter — natural language → movie results.
 * e.g. "funny 90s action movies" or "dark sci-fi like Blade Runner"
 *
 * @param {string} query — natural language description
 * @returns {Promise<Array<object>>} — array of TMDB movie objects
 */
export const aiFilterMovies = async (query) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn('Gemini API key not configured');
        return [];
    }

    if (!query?.trim()) return [];

    const prompt = `You are a movie search engine. The user described what they want to watch:
"${query}"

Return exactly 12 movie titles that best match this description. Focus on well-known, real movies. Consider genre, mood, era, actors, directors, themes, and style.

Respond ONLY with a valid JSON array of objects. No markdown, no extra text.
Format: [{"title":"Movie Title","year":"2020"},{"title":"Another Movie","year":"1999"}]`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
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

        // Resolve each title via TMDB search
        const movies = await Promise.all(
            titles.slice(0, 12).map(async (item) => {
                try {
                    const q = encodeURIComponent(item.title);
                    const yearParam = item.year ? `&year=${item.year}` : '';
                    const res = await fetch(
                        `https://api.themoviedb.org/3/search/movie?query=${q}${yearParam}&page=1`,
                        TMDB_OPTIONS
                    );
                    const d = await res.json();
                    return d.results?.[0] || null;
                } catch {
                    return null;
                }
            })
        );

        return movies.filter(Boolean);
    } catch (err) {
        console.error('Error in AI filter:', err);
        return [];
    }
};
