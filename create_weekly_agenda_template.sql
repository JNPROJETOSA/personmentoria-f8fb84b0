-- =====================================================
-- Weekly Agenda Template Migration
-- =====================================================
-- Creates table for reusable default weekly templates per student
-- =====================================================

CREATE TABLE IF NOT EXISTS public.weekly_agenda_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  tasks text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.weekly_agenda_template ENABLE ROW LEVEL SECURITY;

-- Allow users or mentors/admins to manage weekly agenda template
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'weekly_agenda_template' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.weekly_agenda_template';
  END LOOP;
END $$;

CREATE POLICY "wat_all" ON public.weekly_agenda_template FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_weekly_agenda_template_user 
ON public.weekly_agenda_template(user_id);

SELECT 'Weekly agenda template table created successfully!' as message;
