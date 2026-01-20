-- =====================================================
-- Modify Notebook Entries for Folder Support
-- =====================================================
-- Adds folder_id and name columns to notebook_entries
-- Removes old unique constraint
-- =====================================================

-- Add new columns
ALTER TABLE public.notebook_entries
ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.notebook_folders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS name text DEFAULT 'Caderno sem nome';

-- Drop old unique constraint (user_id, specialty)
ALTER TABLE public.notebook_entries
DROP CONSTRAINT IF EXISTS notebook_entries_user_id_specialty_key;

-- Add new unique constraint (allows multiple notebooks per folder)
ALTER TABLE public.notebook_entries
ADD CONSTRAINT notebook_entries_unique UNIQUE(user_id, folder_id, name);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notebook_entries_folder 
ON public.notebook_entries(folder_id);

-- Success message
SELECT 'Notebook entries table updated for folder support!' as message;
