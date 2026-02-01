
-- Flashcards Evolution Migration

-- 1. Add 'type' column to flashcards (Backward Compatibility: default 'standard')
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'standard';

-- 2. Create 'flashcard_reviews' table for detailed tracking and difficulty analysis
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    flashcard_id uuid REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,
    difficulty integer NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create 'flashcard_study_sessions' table for time tracking
CREATE TABLE IF NOT EXISTS public.flashcard_study_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    cards_reviewed integer DEFAULT 0,
    duration_seconds integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. RLS Policies

-- Reviews
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reviews" ON public.flashcard_reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reviews" ON public.flashcard_reviews
    FOR SELECT USING (auth.uid() = user_id);

-- Study Sessions
ALTER TABLE public.flashcard_study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own sessions" ON public.flashcard_study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own sessions" ON public.flashcard_study_sessions
    FOR SELECT USING (auth.uid() = user_id);

