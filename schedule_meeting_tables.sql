-- Add role column to profiles if it doesn't exist (safety check)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'student';

-- Create meeting_slots table
CREATE TABLE IF NOT EXISTS public.meeting_slots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id uuid REFERENCES public.profiles(id) NOT NULL,
    student_id uuid REFERENCES public.profiles(id), -- Nullable: If null, it's free. If set, it's booked.
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_times CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.meeting_slots ENABLE ROW LEVEL SECURITY;

-- Policies for Meeting Slots

-- Drop existing policies to allow re-running this script without errors
DROP POLICY IF EXISTS "Mentors manage own slots" ON public.meeting_slots;
DROP POLICY IF EXISTS "Students view available or own slots" ON public.meeting_slots;
DROP POLICY IF EXISTS "Students cancel own meetings" ON public.meeting_slots;

-- 1. Mentors/Admins can manage their own slots (ALL operations)
CREATE POLICY "Mentors manage own slots" 
ON public.meeting_slots 
FOR ALL 
USING (auth.uid() = mentor_id);

-- 2. Students can VIEW available slots (future only) OR their own booked slots
CREATE POLICY "Students view available or own slots" 
ON public.meeting_slots 
FOR SELECT 
USING (
    (student_id IS NULL AND start_time > now()) -- Available future slots
    OR 
    (student_id = auth.uid()) -- Own bookings (past or future)
);

-- 3. Students can UPDATE (Cancel) their own slots if >12h rule met
-- Actually simpler: Just allow UPDATE if student_id is auth.uid().
-- The generic "UPDATE" policy for students:
CREATE POLICY "Students cancel own meetings"
ON public.meeting_slots
FOR UPDATE
USING (student_id = auth.uid())
WITH CHECK (student_id IS NULL); -- Can only set it to NULL (cancel)

-- Function to handle Booking (Concurrency + 1/Week Limit)
CREATE OR REPLACE FUNCTION public.book_meeting(slot_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_slot record;
    week_start timestamp with time zone;
    week_end timestamp with time zone;
    existing_booking uuid;
BEGIN
    -- 1. Get the slot details
    SELECT * INTO target_slot FROM public.meeting_slots WHERE id = slot_id;
    
    IF target_slot IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Horário não encontrado.');
    END IF;

    IF target_slot.student_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Este horário já foi reservado por outro aluno.');
    END IF;

    -- 2. Check "1 meeting per week" rule
    -- Define week as ISO week of the target slot's start time
    week_start := date_trunc('week', target_slot.start_time);
    week_end := week_start + interval '1 week';

    SELECT id INTO existing_booking 
    FROM public.meeting_slots 
    WHERE student_id = auth.uid() 
      AND start_time >= week_start 
      AND start_time < week_end;

    IF existing_booking IS NOT NULL THEN
        RETURN json_build_object('success', false, 'message', 'Você já possui uma reunião marcada nesta semana (' || to_char(week_start, 'DD/MM') || ' a ' || to_char(week_end - interval '1 day', 'DD/MM') || '). Cancele a anterior ou aguarde a próxima semana.');
    END IF;

    -- 3. Claim the slot
    UPDATE public.meeting_slots 
    SET student_id = auth.uid()
    WHERE id = slot_id AND student_id IS NULL; -- double check concurrency

    IF FOUND THEN
        RETURN json_build_object('success', true, 'message', 'Reunião agendada com sucesso!');
    ELSE
        RETURN json_build_object('success', false, 'message', 'Não foi possível reservar. Talvez alguém tenha clicado antes de você.');
    END IF;
END;
$$;
