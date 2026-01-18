-- COMPLETE CONTENT TABLES SETUP
-- Project: jibsgrfzrkviffcignsm
-- This script creates all tables needed for the application features

-- ============================================
-- 1. CLASSES
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    area text NOT NULL,
    date timestamp with time zone DEFAULT now(),
    studied boolean DEFAULT false,
    priority integer DEFAULT 2,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own classes" ON public.classes
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 2. EXERCISE LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.exercise_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date timestamp with time zone DEFAULT now(),
    area text NOT NULL,
    topic text NOT NULL,
    total_questions integer DEFAULT 0,
    correct_answers integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own exercises" ON public.exercise_logs
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 3. EXAM LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_logs (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    institution text,
    date timestamp with time zone DEFAULT now(),
    total_questions integer DEFAULT 0,
    correct_answers integer DEFAULT 0,
    areas jsonb DEFAULT '[]'::jsonb,
    area_details jsonb DEFAULT '[]'::jsonb,
    completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.exam_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own exams" ON public.exam_logs
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 4. REVIEWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    topic text NOT NULL,
    area text NOT NULL,
    due_date timestamp with time zone NOT NULL,
    original_date timestamp with time zone DEFAULT now(),
    accuracy numeric DEFAULT 0,
    day_interval integer DEFAULT 1,
    priority integer DEFAULT 2,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reviews" ON public.reviews
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. FLASHCARDS
-- ============================================
CREATE TABLE IF NOT EXISTS public.flashcards (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    area text NOT NULL,
    front text NOT NULL,
    back text NOT NULL,
    difficulty text,
    folder_id uuid,
    last_reviewed timestamp with time zone,
    next_review timestamp with time zone,
    review_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own flashcards" ON public.flashcards
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 6. GOALS & PROGRESS
-- ============================================
CREATE TABLE IF NOT EXISTS public.goals (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    weekly_questions integer DEFAULT 50,
    target_accuracy numeric DEFAULT 70,
    target_topics_per_week integer DEFAULT 5,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals" ON public.goals
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 7. NOTEBOOKS (Caderno de Erros)
-- ============================================
CREATE TABLE IF NOT EXISTS public.notebooks (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    data jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notebook" ON public.notebooks
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 8. DREAM BOARD
-- ============================================
CREATE TABLE IF NOT EXISTS public.dream_board (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL,
    content text NOT NULL,
    title text,
    color text,
    font_color text,
    font_size text,
    is_auto_fit boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.dream_board ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own dream board" ON public.dream_board
    FOR ALL USING (auth.uid() = user_id);
