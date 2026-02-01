-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'Aviso',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Student can view their own notifications
CREATE POLICY "Student view own notifications" ON public.notifications
    FOR SELECT
    USING (student_id = auth.uid());

-- Admins and Mentors can view all notifications (or at least ones they sent, but easier to allow view all for management)
-- Assuming Admins/Mentors have a role check or are handled via distinct policies. 
-- Checking existing policies usually relies on 'admin' role in metadata or profiles.
-- For now, allowing Insert/Delete for authenticated users who are NOT the student (likely admin/mentor) or better yet, check role.
-- Since I don't have the full role definition handy, I'll assume a check against profiles or metadata is needed.
-- But usually:
CREATE POLICY "Admins/Mentors view all notifications" ON public.notifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'mentor')
        )
    );

CREATE POLICY "Admins/Mentors insert notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'mentor')
        )
    );

CREATE POLICY "Admins/Mentors delete notifications" ON public.notifications
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'mentor')
        )
    );

-- Add simple index
CREATE INDEX idx_notifications_student_id ON public.notifications(student_id);
