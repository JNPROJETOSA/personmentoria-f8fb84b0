-- FIX: Add Missing Flashcard Folders Table
-- Project: jibsgrfzrkviffcignsm

-- The frontend (useFlashcardFolders.ts) expects a table named 'flashcard_folders'
-- This enables organizing flashcards into folders within areas

CREATE TABLE IF NOT EXISTS public.flashcard_folders (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    area text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.flashcard_folders ENABLE ROW LEVEL SECURITY;

-- Policy for managing folders
CREATE POLICY "Users can manage their own flashcard folders" ON public.flashcard_folders
    FOR ALL USING (auth.uid() = user_id);

-- Ensure flashcards table has the link (if not created effectively before)
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.flashcard_folders(id) ON DELETE SET NULL;

-- Verify
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'flashcard_folders';
