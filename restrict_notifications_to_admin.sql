
-- Update RLS policies for notifications table to restrict Mentor access

-- Drop existing policies if they match the old broad ones (or just replace them)
-- Access Policy: Admin and Mentor can INSERT (Old) -> Admin ONLY can INSERT (New)
DROP POLICY IF EXISTS "Admins and Mentors can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Access Policy: Admin and Mentor can UPDATE/DELETE (Old) -> Admin ONLY can UPDATE/DELETE (New)
DROP POLICY IF EXISTS "Admins and Mentors can update/delete notifications" ON public.notifications;
CREATE POLICY "Admins can update/delete notifications" ON public.notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Note: "Users can view their own notifications" policy remains unchanged.
