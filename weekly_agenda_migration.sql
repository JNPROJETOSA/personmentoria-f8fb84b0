-- =====================================================
-- Weekly Agenda Migration
-- =====================================================
-- Creates table for weekly agenda/schedule management
-- =====================================================

-- Create weekly_agenda table
CREATE TABLE IF NOT EXISTS public.weekly_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  tasks text[] DEFAULT '{}',
  completed_indices integer[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start, day_of_week)
);

-- Enable RLS
ALTER TABLE public.weekly_agenda ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own agenda
CREATE POLICY "Users can manage their own weekly agenda"
ON public.weekly_agenda
FOR ALL
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_weekly_agenda_user_week 
ON public.weekly_agenda(user_id, week_start);

-- Success message
SELECT 'Weekly agenda table created successfully!' as message;
