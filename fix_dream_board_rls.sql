-- Fix RLS Policy for dream_board_items to ensure DELETE works
-- Sometimes general policies might have edge cases. We will be explicit.

DROP POLICY IF EXISTS "Users can manage their own dream board items" ON public.dream_board_items;

CREATE POLICY "Users can manage their own dream board items" ON public.dream_board_items
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Explicitly verify permissions
ALTER TABLE public.dream_board_items FORCE ROW LEVEL SECURITY;
