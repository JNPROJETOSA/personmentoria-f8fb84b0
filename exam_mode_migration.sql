-- =====================================================
-- Exam Mode Migration
-- =====================================================
-- Ensures exam_sessions table exists and has all required columns
-- for tracking performance (questions, correct answers)
-- =====================================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  distractions jsonb DEFAULT '[]'::jsonb,
  post_emotions jsonb DEFAULT '{}'::jsonb,
  diary_notes text,
  emotional_state jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own sessions
CREATE POLICY "Users can manage their own exam sessions"
ON public.exam_sessions
FOR ALL
USING (auth.uid() = user_id);

-- Add performance columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_sessions' AND column_name = 'total_questions') THEN
        ALTER TABLE public.exam_sessions ADD COLUMN total_questions integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_sessions' AND column_name = 'correct_answers') THEN
        ALTER TABLE public.exam_sessions ADD COLUMN correct_answers integer DEFAULT 0;
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_date 
ON public.exam_sessions(user_id, completed_at DESC);

-- Success message
SELECT 'Exam sessions table updated successfully!' as message;
