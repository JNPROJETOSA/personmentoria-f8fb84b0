-- Add frozen column to profiles table
ALTER TABLE public.profiles ADD COLUMN frozen boolean NOT NULL DEFAULT false;

-- Create a function to check if user is frozen
CREATE OR REPLACE FUNCTION public.is_user_frozen(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT frozen FROM public.profiles WHERE user_id = check_user_id),
    false
  )
$$;

-- Update RLS policies to prevent frozen users from modifying data

-- Exercises: Update existing policies to check frozen status
DROP POLICY IF EXISTS "Users can insert their own exercises" ON public.exercises;
CREATE POLICY "Users can insert their own exercises" ON public.exercises
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own exercises" ON public.exercises;
CREATE POLICY "Users can update their own exercises" ON public.exercises
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own exercises" ON public.exercises;
CREATE POLICY "Users can delete their own exercises" ON public.exercises
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Exams
DROP POLICY IF EXISTS "Users can insert their own exams" ON public.exams;
CREATE POLICY "Users can insert their own exams" ON public.exams
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own exams" ON public.exams;
CREATE POLICY "Users can update their own exams" ON public.exams
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own exams" ON public.exams;
CREATE POLICY "Users can delete their own exams" ON public.exams
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Classes
DROP POLICY IF EXISTS "Users can insert their own classes" ON public.classes;
CREATE POLICY "Users can insert their own classes" ON public.classes
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own classes" ON public.classes;
CREATE POLICY "Users can update their own classes" ON public.classes
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own classes" ON public.classes;
CREATE POLICY "Users can delete their own classes" ON public.classes
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Flashcards
DROP POLICY IF EXISTS "Users can insert their own flashcards" ON public.flashcards;
CREATE POLICY "Users can insert their own flashcards" ON public.flashcards
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own flashcards" ON public.flashcards;
CREATE POLICY "Users can update their own flashcards" ON public.flashcards
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own flashcards" ON public.flashcards;
CREATE POLICY "Users can delete their own flashcards" ON public.flashcards
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Reviews
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
CREATE POLICY "Users can insert their own reviews" ON public.reviews
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" ON public.reviews
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Goals
DROP POLICY IF EXISTS "Users can insert their own goals" ON public.goals;
CREATE POLICY "Users can insert their own goals" ON public.goals
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own goals" ON public.goals;
CREATE POLICY "Users can update their own goals" ON public.goals
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own goals" ON public.goals;
CREATE POLICY "Users can delete their own goals" ON public.goals
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Weekly Agenda
DROP POLICY IF EXISTS "Users can insert their own agenda" ON public.weekly_agenda;
CREATE POLICY "Users can insert their own agenda" ON public.weekly_agenda
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own agenda" ON public.weekly_agenda;
CREATE POLICY "Users can update their own agenda" ON public.weekly_agenda
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own agenda" ON public.weekly_agenda;
CREATE POLICY "Users can delete their own agenda" ON public.weekly_agenda
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Notebook Entries
DROP POLICY IF EXISTS "Users can insert their own notebook entries" ON public.notebook_entries;
CREATE POLICY "Users can insert their own notebook entries" ON public.notebook_entries
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own notebook entries" ON public.notebook_entries;
CREATE POLICY "Users can update their own notebook entries" ON public.notebook_entries
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own notebook entries" ON public.notebook_entries;
CREATE POLICY "Users can delete their own notebook entries" ON public.notebook_entries
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Dream Board Items
DROP POLICY IF EXISTS "Users can insert their own dream board items" ON public.dream_board_items;
CREATE POLICY "Users can insert their own dream board items" ON public.dream_board_items
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own dream board items" ON public.dream_board_items;
CREATE POLICY "Users can update their own dream board items" ON public.dream_board_items
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own dream board items" ON public.dream_board_items;
CREATE POLICY "Users can delete their own dream board items" ON public.dream_board_items
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Burnout Checkins
DROP POLICY IF EXISTS "Users can insert their own burnout checkins" ON public.burnout_checkins;
CREATE POLICY "Users can insert their own burnout checkins" ON public.burnout_checkins
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own burnout checkins" ON public.burnout_checkins;
CREATE POLICY "Users can update their own burnout checkins" ON public.burnout_checkins
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own burnout checkins" ON public.burnout_checkins;
CREATE POLICY "Users can delete their own burnout checkins" ON public.burnout_checkins
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Editorial Progress
DROP POLICY IF EXISTS "Users can insert their own editorial progress" ON public.editorial_progress;
CREATE POLICY "Users can insert their own editorial progress" ON public.editorial_progress
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own editorial progress" ON public.editorial_progress;
CREATE POLICY "Users can update their own editorial progress" ON public.editorial_progress
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own editorial progress" ON public.editorial_progress;
CREATE POLICY "Users can delete their own editorial progress" ON public.editorial_progress
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Editorials
DROP POLICY IF EXISTS "Users can insert their own editorials" ON public.editorials;
CREATE POLICY "Users can insert their own editorials" ON public.editorials
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own editorials" ON public.editorials;
CREATE POLICY "Users can update their own editorials" ON public.editorials
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own editorials" ON public.editorials;
CREATE POLICY "Users can delete their own editorials" ON public.editorials
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Exam Sessions
DROP POLICY IF EXISTS "Users can insert their own exam sessions" ON public.exam_sessions;
CREATE POLICY "Users can insert their own exam sessions" ON public.exam_sessions
FOR INSERT WITH CHECK (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can update their own exam sessions" ON public.exam_sessions;
CREATE POLICY "Users can update their own exam sessions" ON public.exam_sessions
FOR UPDATE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own exam sessions" ON public.exam_sessions;
CREATE POLICY "Users can delete their own exam sessions" ON public.exam_sessions
FOR DELETE USING (auth.uid() = user_id AND NOT is_user_frozen(auth.uid()));

-- Profiles: Allow admins to update frozen status
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can still update their own profile if not frozen
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id AND NOT frozen);