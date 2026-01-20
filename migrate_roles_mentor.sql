-- =====================================================
-- MENTOR ROLE MIGRATION
-- =====================================================
-- 1. Updates schema to allow 'mentor' role
-- 2. Adds RLS policies for Mentors to view student data
-- 3. Adds RLS policies for Mentors to manage agenda/goals
-- =====================================================

-- 1. Update Constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'student', 'mentor'));

ALTER TABLE public.admin_whitelist DROP CONSTRAINT IF EXISTS admin_whitelist_role_check;
ALTER TABLE public.admin_whitelist ADD CONSTRAINT admin_whitelist_role_check CHECK (role IN ('admin', 'student', 'mentor'));

-- 2. Grant Read Access to Mentors (Profiles)
DROP POLICY IF EXISTS "Mentors can view all profiles" ON public.profiles;
CREATE POLICY "Mentors can view all profiles" ON public.profiles
  FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- 3. Grant Read Access to Student Content
-- Helper function to avoid repeating the subquery (optional to keep it simple, I'll just repeat the policy structure)

-- Exercises
DROP POLICY IF EXISTS "Mentors can view all exercises" ON public.exercises;
CREATE POLICY "Mentors can view all exercises" ON public.exercises FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Exams
DROP POLICY IF EXISTS "Mentors can view all exams" ON public.exams;
CREATE POLICY "Mentors can view all exams" ON public.exams FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Classes
DROP POLICY IF EXISTS "Mentors can view all classes" ON public.classes;
CREATE POLICY "Mentors can view all classes" ON public.classes FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Flashcards
DROP POLICY IF EXISTS "Mentors can view all flashcards" ON public.flashcards;
CREATE POLICY "Mentors can view all flashcards" ON public.flashcards FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Dream Board
DROP POLICY IF EXISTS "Mentors can view all dream_board_items" ON public.dream_board_items;
CREATE POLICY "Mentors can view all dream_board_items" ON public.dream_board_items FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Burnout Checkins
DROP POLICY IF EXISTS "Mentors can view all burnout_checkins" ON public.burnout_checkins;
CREATE POLICY "Mentors can view all burnout_checkins" ON public.burnout_checkins FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Editorial (Progress)
DROP POLICY IF EXISTS "Mentors can view all editorial_progress" ON public.editorial_progress;
CREATE POLICY "Mentors can view all editorial_progress" ON public.editorial_progress FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Reviews
DROP POLICY IF EXISTS "Mentors can view all reviews" ON public.reviews;
CREATE POLICY "Mentors can view all reviews" ON public.reviews FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- 4. Grant Write Access to Agenda and Goals

-- Weekly Agenda
DROP POLICY IF EXISTS "Mentors can manage all weekly_agenda" ON public.weekly_agenda;
CREATE POLICY "Mentors can manage all weekly_agenda" ON public.weekly_agenda FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Goals (Assuming table 'goals' exists)
-- Just in case, create table if not exists (based on useGoals.sql logic typically)
CREATE TABLE IF NOT EXISTS public.goals (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    weekly_questions integer DEFAULT 50,
    target_accuracy integer DEFAULT 80,
    target_topics_per_week integer DEFAULT 5,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Goals Policies
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
CREATE POLICY "Users can manage their own goals" ON public.goals FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all goals" ON public.goals;
CREATE POLICY "Admins can manage all goals" ON public.goals FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

DROP POLICY IF EXISTS "Mentors can manage all goals" ON public.goals;
CREATE POLICY "Mentors can manage all goals" ON public.goals FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Success Output
SELECT 'Mentor role and permissions setup completed successfully.' as message;
