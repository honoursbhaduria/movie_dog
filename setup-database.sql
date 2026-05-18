-- ==========================================================
-- MOVIE DOG DATABASE SETUP
-- ==========================================================
-- Run this in your Supabase SQL Editor to enable wishlist 
-- persistence to the database.
-- ==========================================================

-- 1. Create the favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  movie_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  vote_average FLOAT,
  release_date TEXT,
  original_language TEXT,
  media_type TEXT DEFAULT 'movie',
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate saves for the same user and movie
  UNIQUE(user_id, movie_id)
);

-- 2. Enable Row Level Security (RLS)
-- This is crucial! It prevents users from seeing or editing 
-- each other's favorites.
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy for all operations
-- Users can only see, insert, update, or delete their own rows
CREATE POLICY "Users can manage their own favorites"
  ON favorites FOR ALL
  USING (auth.uid() = user_id);

-- 4. Create an index for faster lookups
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites (user_id);

-- ==========================================================
-- OPTIONAL: Trending Searches Table
-- ==========================================================
CREATE TABLE IF NOT EXISTS trending_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_term TEXT UNIQUE NOT NULL,
  count INTEGER DEFAULT 1,
  movie_id BIGINT,
  poster_url TEXT,
  title TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow anyone to read trending searches, but only authenticated
-- or specific processes to update (adjust as needed for your app)
ALTER TABLE trending_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to trending"
  ON trending_searches FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert/update to trending"
  ON trending_searches FOR ALL
  USING (true)
  WITH CHECK (true);
