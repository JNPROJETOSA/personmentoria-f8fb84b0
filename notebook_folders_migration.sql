-- =====================================================
-- Notebook Folders Migration
-- =====================================================
-- Creates folders table for organizing notebooks
-- =====================================================

-- Create notebook_folders table
CREATE TABLE IF NOT EXISTS public.notebook_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area text NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, area, name)
);

-- Enable RLS
ALTER TABLE public.notebook_folders ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own folders
CREATE POLICY "Users can manage their own notebook folders"
ON public.notebook_folders
FOR ALL
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_notebook_folders_user_area 
ON public.notebook_folders(user_id, area);

-- Success message
SELECT 'Notebook folders table created successfully!' as message;
