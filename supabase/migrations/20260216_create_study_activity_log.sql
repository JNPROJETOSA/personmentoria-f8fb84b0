-- Create study_activity_log table to track all study activities
-- This table serves as the single source of truth for:
-- 1. Study consistency calendar (last 6 months)
-- 2. Streak calculation (consecutive study days)

CREATE TABLE IF NOT EXISTS public.study_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('exercise', 'exam', 'class', 'flashcard', 'notebook', 'editorial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, activity_date, activity_type)
);

-- Create index for fast querying by user and date range
CREATE INDEX IF NOT EXISTS idx_study_activity_log_user_date 
  ON public.study_activity_log(user_id, activity_date DESC);

-- Enable Row Level Security
ALTER TABLE public.study_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own activity logs
CREATE POLICY "Users can view their own activity logs"
  ON public.study_activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
  ON public.study_activity_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity logs"
  ON public.study_activity_log FOR DELETE
  USING (auth.uid() = user_id);

-- Admin policies for viewing all activity logs
CREATE POLICY "Admins can view all activity logs"
  ON public.study_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'mentor')
    )
  );

-- Function to automatically log activity when exercise is created
CREATE OR REPLACE FUNCTION log_exercise_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.study_activity_log (user_id, activity_date, activity_type)
  VALUES (NEW.user_id, NEW.date, 'exercise')
  ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically log activity when exam is created
CREATE OR REPLACE FUNCTION log_exam_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.study_activity_log (user_id, activity_date, activity_type)
  VALUES (NEW.user_id, NEW.date, 'exam')
  ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically log activity when class is marked as studied
CREATE OR REPLACE FUNCTION log_class_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if the class is being marked as studied (not when created)
  IF NEW.studied = true AND (OLD IS NULL OR OLD.studied = false) THEN
    INSERT INTO public.study_activity_log (user_id, activity_date, activity_type)
    VALUES (NEW.user_id, COALESCE(NEW.studied_date, NEW.date, CURRENT_DATE), 'class')
    ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically log activity when flashcard is created
CREATE OR REPLACE FUNCTION log_flashcard_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.study_activity_log (user_id, activity_date, activity_type)
  VALUES (NEW.user_id, CURRENT_DATE, 'flashcard')
  ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically log activities
DROP TRIGGER IF EXISTS trigger_log_exercise_activity ON public.exercises;
CREATE TRIGGER trigger_log_exercise_activity
  AFTER INSERT ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION log_exercise_activity();

DROP TRIGGER IF EXISTS trigger_log_exam_activity ON public.exams;
CREATE TRIGGER trigger_log_exam_activity
  AFTER INSERT ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION log_exam_activity();

DROP TRIGGER IF EXISTS trigger_log_class_activity ON public.classes;
CREATE TRIGGER trigger_log_class_activity
  AFTER INSERT OR UPDATE ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION log_class_activity();

DROP TRIGGER IF EXISTS trigger_log_flashcard_activity ON public.flashcards;
CREATE TRIGGER trigger_log_flashcard_activity
  AFTER INSERT ON public.flashcards
  FOR EACH ROW
  EXECUTE FUNCTION log_flashcard_activity();

-- Backfill existing data from exercises table
INSERT INTO public.study_activity_log (user_id, activity_date, activity_type)
SELECT DISTINCT user_id, date, 'exercise'
FROM public.exercises
ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;

-- Backfill existing data from exams table
INSERT INTO public.study_activity_log (user_id, activity_date, activity_type)
SELECT DISTINCT user_id, date, 'exam'
FROM public.exams
ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;

-- Backfill existing data from classes table (only studied classes)
INSERT INTO public.study_activity_log (user_id, activity_date, activity_type)
SELECT DISTINCT user_id, COALESCE(studied_date, date), 'class'
FROM public.classes
WHERE studied = true
ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;

-- Backfill existing flashcards (use created_at date, approximation)
INSERT INTO public.study_activity_log (user_id, activity_date, activity_type)
SELECT DISTINCT user_id, DATE(created_at), 'flashcard'
FROM public.flashcards
ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;
