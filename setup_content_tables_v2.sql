-- COMPLETE CONTENT TABLES SETUP V2 (CORRECTED)
-- Project: jibsgrfzrkviffcignsm
-- This script creates the exact tables required by the frontend code

-- ============================================
-- 1. CLASSES
-- ============================================
CREATE TABLE IF NOT EXISTS public.classes (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    specialty text NOT NULL, -- Hook uses 'specialty' not 'area'
    date timestamp with time zone DEFAULT now(),
    studied boolean DEFAULT false,
    priority integer DEFAULT 2,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own classes" ON public.classes
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 2. EXERCISES (Table: exercises)
-- ============================================
CREATE TABLE IF NOT EXISTS public.exercises (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date timestamp with time zone DEFAULT now(),
    specialty text NOT NULL, -- Hook uses 'specialty'
    topic text NOT NULL,
    total_questions integer DEFAULT 0,
    correct_answers integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own exercises" ON public.exercises
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 3. EXAMS (Table: exams)
-- ============================================
CREATE TABLE IF NOT EXISTS public.exams (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    institution text,
    date timestamp with time zone DEFAULT now(),
    performance jsonb DEFAULT '{}'::jsonb, -- Hook stores all stats in this JSON column
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own exams" ON public.exams
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 4. FLASHCARDS
-- ============================================
CREATE TABLE IF NOT EXISTS public.flashcards (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    area text NOT NULL,
    front text NOT NULL,
    back text NOT NULL,
    folder_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own flashcards" ON public.flashcards
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. DREAM BOARD & MIND MAPS (Table: dream_board_items)
-- ============================================
CREATE TABLE IF NOT EXISTS public.dream_board_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL, -- 'image', 'note', 'mind_map', 'mind_map_folder'
    content text NOT NULL, -- Stores JSON or text
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.dream_board_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own dream board items" ON public.dream_board_items
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 6. BURNOUT TRACKER (Table: burnout_checkins)
-- ============================================
CREATE TABLE IF NOT EXISTS public.burnout_checkins (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date timestamp with time zone DEFAULT now(),
    feeling integer,
    energy integer,
    mood integer,
    sleep text,
    stress integer,
    productivity integer,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.burnout_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own burnout checkins" ON public.burnout_checkins
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 7. EDITORIALS (Table: editorials)
-- ============================================
CREATE TABLE IF NOT EXISTS public.editorials (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.editorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own editorials" ON public.editorials
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 8. EDITORIAL PROGRESS (Table: editorial_progress)
-- ============================================
CREATE TABLE IF NOT EXISTS public.editorial_progress (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    editorial_id uuid REFERENCES public.editorials(id) ON DELETE CASCADE,
    area text NOT NULL,
    sub_area text NOT NULL,
    topic text NOT NULL,
    status text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, area, sub_area, topic)
);

ALTER TABLE public.editorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own editorial progress" ON public.editorial_progress
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 9. REVIEWS (Table: reviews)
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
