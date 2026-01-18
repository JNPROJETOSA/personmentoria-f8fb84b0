-- FIX: Add Missing Notebook Table
-- Project: jibsgrfzrkviffcignsm

-- The frontend expects a table named 'notebook_entries'
-- with columns: user_id, specialty, content

CREATE TABLE IF NOT EXISTS public.notebook_entries (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    specialty text NOT NULL,
    content text,
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, specialty)
);

ALTER TABLE public.notebook_entries ENABLE ROW LEVEL SECURITY;

-- Allow users to fully manage their own notebook entries
CREATE POLICY "Users can manage their own notebook" ON public.notebook_entries
    FOR ALL USING (auth.uid() = user_id);

-- Verify it was created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'notebook_entries';
