-- ==========================================================
-- MOVIE DOG: COMPLETE DATABASE RESET & SCHEMA
-- ==========================================================
-- WARNING: Running this will DELETE all existing data in 
-- favorites and trending_searches. 
-- ==========================================================

-- 1. CLEANUP (Drop existing tables and policies)
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS trending_searches CASCADE;

-- 2. CREATE TRENDING SEARCHES TABLE
-- Stores popular searches across the platform
CREATE TABLE trending_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_term TEXT UNIQUE NOT NULL,
  count INTEGER DEFAULT 1,
  movie_id BIGINT,
  poster_url TEXT,
  title TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE FAVORITES (WISHLIST) TABLE
-- Stores per-user saved movies and TV shows
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL, -- Links to Supabase Auth
  movie_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  vote_average FLOAT,
  release_date TEXT,
  original_language TEXT,
  media_type TEXT DEFAULT 'movie', -- 'movie' or 'tv'
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent the same user from saving the same movie twice
  UNIQUE(user_id, movie_id)
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX idx_favorites_user_id ON favorites (user_id);
CREATE INDEX idx_trending_count ON trending_searches (count DESC);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_searches ENABLE ROW LEVEL SECURITY;

-- 6. SECURITY POLICIES

-- FAVORITES: Users can only see and modify THEIR OWN data
CREATE POLICY "Users can view their own favorites" 
  ON favorites FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites" 
  ON favorites FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorites" 
  ON favorites FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites" 
  ON favorites FOR DELETE 
  USING (auth.uid() = user_id);

-- TRENDING_SEARCHES: Anyone can read, App can update
-- (In a production app, you might restrict updates to a service role, 
-- but for this project we allow public updates to the count)
CREATE POLICY "Allow public read access to trending"
  ON trending_searches FOR SELECT
  USING (true);

CREATE POLICY "Allow public updates to trending counts"
  ON trending_searches FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==========================================================
-- SCHEMA READY
-- ==========================================================
