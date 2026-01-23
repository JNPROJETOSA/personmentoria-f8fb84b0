-- =====================================================
-- Add Mentor RLS Policies for Weekly Agenda
-- =====================================================
-- This migration adds the missing mentor permissions
-- for managing student weekly agendas
-- =====================================================

-- Drop existing mentor policies if they exist (in case of re-run)
DROP POLICY IF EXISTS "Mentors can view all weekly_agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Mentors can insert weekly_agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Mentors can update weekly_agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Mentors can delete weekly_agenda" ON public.weekly_agenda;

-- Create SELECT policy - Mentors can view all student agendas
CREATE POLICY "Mentors can view all weekly_agenda"
ON public.weekly_agenda
FOR SELECT
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Create INSERT policy - Mentors can create agenda items for any student
CREATE POLICY "Mentors can insert weekly_agenda"
ON public.weekly_agenda
FOR INSERT
WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Create UPDATE policy - Mentors can modify agenda items for any student
CREATE POLICY "Mentors can update weekly_agenda"
ON public.weekly_agenda
FOR UPDATE
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Create DELETE policy - Mentors can remove agenda items for any student
CREATE POLICY "Mentors can delete weekly_agenda"
ON public.weekly_agenda
FOR DELETE
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'mentor'));

-- Success message
SELECT 'Mentor weekly_agenda policies created successfully!' as message;
