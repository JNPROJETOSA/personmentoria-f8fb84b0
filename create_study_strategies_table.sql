-- Create study_strategies table
CREATE TABLE IF NOT EXISTS public.study_strategies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    macro_strategy TEXT,
    micro_strategy TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT study_strategies_student_id_key UNIQUE (student_id)
);

-- Enable RLS
ALTER TABLE public.study_strategies ENABLE ROW LEVEL SECURITY;

-- SELECT Policy
CREATE POLICY "View Study Strategies" ON public.study_strategies
    FOR SELECT USING (
        (student_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'mentor'))
    );

-- INSERT Policy (Admin/Mentor)
CREATE POLICY "Insert Study Strategies" ON public.study_strategies
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'mentor'))
    );

-- UPDATE Policy (Admin/Mentor)
CREATE POLICY "Update Study Strategies" ON public.study_strategies
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'mentor'))
    );

-- Trigger Function to enforce Mentor limitations
CREATE OR REPLACE FUNCTION check_study_strategy_update()
RETURNS TRIGGER AS $$
DECLARE
    user_role text;
BEGIN
    -- Update updated_at and updated_by
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();

    -- Get user role
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    
    -- If Mentor, prevent changes to macro_strategy
    IF user_role = 'mentor' THEN
        IF OLD.macro_strategy IS DISTINCT FROM NEW.macro_strategy THEN
            RAISE EXCEPTION 'Mentors allowed only update micro_strategy';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach Trigger
DROP TRIGGER IF EXISTS check_study_strategy_update_trigger ON public.study_strategies;
CREATE TRIGGER check_study_strategy_update_trigger
BEFORE UPDATE ON public.study_strategies
FOR EACH ROW
EXECUTE FUNCTION check_study_strategy_update();
