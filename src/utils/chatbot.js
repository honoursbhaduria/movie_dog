// AI Movie Chatbot — Gemini with Google Search grounding + TMDB resolution

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

const SYSTEM_PROMPT = `You are MovieDog, a movie recommendation assistant. Keep replies SHORT (1-2 sentences max + movie list).

Rules:
- Recommend real movies with title and year.
- When recommending, end with JSON:
\`\`\`json
[{"title":"Movie","year":"2020","reason":"Brief reason"}]
\`\`\`
- Only include JSON when recommending. For questions, reply normally.
- Recommend 3-5 movies per request.
- Ask follow-up if the request is vague.`;

/**
 * Send a message to the AI chatbot.
 * @param {Array<{role: string, text: string}>} history - conversation history
 * @param {string} userMessage - the new user message
 * @returns {Promise<{reply: string, movies: Array}>}
 */
export const sendChatMessage = async (history, userMessage) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        return { reply: "I'm not configured yet. Please add a Gemini API key.", movies: [] };
    }

    // Build conversation contents for Gemini
    const contents = [];

    // Add conversation history (keep only last 6 messages to save tokens)
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
        contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        });
    }

    // Add the new user message
    contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
    });

    try {
        const data = await callGemini(contents);
        const parts = data.candidates?.[0]?.content?.parts || [];

        // Combine all text parts
        let fullText = parts
            .filter(p => p.text)
            .map(p => p.text)
            .join('');

        if (!fullText) {
            return { reply: "Sorry, I couldn't come up with a response. Try asking differently! 🎬", movies: [] };
        }

        // Extract movie JSON from response (if any)
        const jsonMatch = fullText.match(/```json\s*(\[[\s\S]*?\])\s*```/);
        let movieRecs = [];

        if (jsonMatch) {
            try {
                movieRecs = JSON.parse(jsonMatch[1]);
            } catch {
                // If JSON parse fails, try a looser match
                const looseMatch = fullText.match(/\[[\s\S]*?\]/);
                if (looseMatch) {
                    try { movieRecs = JSON.parse(looseMatch[0]); } catch { /* ignore */ }
                }
            }

            // Remove the JSON block from the display text
            fullText = fullText.replace(/```json\s*\[[\s\S]*?\]\s*```/, '').trim();
        } else {
            // Try to find a bare JSON array
            const bareMatch = fullText.match(/\[\s*\{\s*"title"[\s\S]*?\}\s*\]/);
            if (bareMatch) {
                try {
                    movieRecs = JSON.parse(bareMatch[0]);
                    fullText = fullText.replace(bareMatch[0], '').trim();
                } catch { /* ignore */ }
            }
        }

        // Clean up any remaining markdown artifacts
        fullText = fullText.replace(/```\s*```/g, '').trim();

        // Resolve movies via TMDB
        let movies = [];
        if (movieRecs.length > 0) {
            movies = await resolveMoviesFromTMDB(movieRecs);
        }

        return { reply: fullText || "Here are my recommendations! 🎥", movies };
    } catch (err) {
        console.error('Chatbot error:', err);
        return { reply: "Oops, something went wrong. Please try again! 🎬", movies: [] };
    }
};

/**
 * Call Gemini API. Tries with Google Search grounding first,
 * falls back to plain Gemini if rate-limited (429).
 * Retries once with a delay on rate-limit errors.
 */
const callGemini = async (contents, useSearch = true, retryCount = 0) => {
    const body = {
        system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
        },
        contents,
        generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1024,
        },
    };

    if (useSearch) {
        body.tools = [{ google_search: {} }];
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
const resolveMoviesFromTMDB = async (recs) => {
    const resolved = await Promise.all(
        recs.slice(0, 8).map(async (rec) => {
            try {
                const query = encodeURIComponent(rec.title);
                const yearParam = rec.year ? `&year=${rec.year}` : '';
                const res = await fetch(
                    `https://api.themoviedb.org/3/search/movie?query=${query}${yearParam}&page=1`,
                    TMDB_OPTIONS
                );
                const data = await res.json();
                const movie = data.results?.[0] || null;

                return movie ? {
                    ...movie,
                    _reason: rec.reason || '',
                } : null;
            } catch {
                return null;
            }
        })
    );

    return resolved.filter(Boolean);
};
