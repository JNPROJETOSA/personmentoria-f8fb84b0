-- =====================================================
-- Migrate Existing Notebook Data to Folder Structure
-- =====================================================
-- Creates default folders and assigns existing notebooks
-- =====================================================

-- Step 1: Create default folder for each existing notebook entry
INSERT INTO public.notebook_folders (user_id, area, name)
SELECT DISTINCT user_id, specialty, 'Cadernos Gerais'
FROM public.notebook_entries
WHERE content IS NOT NULL AND content != ''
ON CONFLICT (user_id, area, name) DO NOTHING;

-- Step 2: Update existing notebook entries to link to default folders
UPDATE public.notebook_entries ne
SET 
  folder_id = nf.id,
  name = 'Caderno Principal'
FROM public.notebook_folders nf
WHERE ne.user_id = nf.user_id 
  AND ne.specialty = nf.area
  AND nf.name = 'Cadernos Gerais'
  AND ne.folder_id IS NULL;

-- Verify migration
SELECT 
  COUNT(*) as total_folders,
  COUNT(DISTINCT user_id) as users_with_folders
FROM public.notebook_folders;

SELECT 
  COUNT(*) as total_notebooks,
  COUNT(CASE WHEN folder_id IS NOT NULL THEN 1 END) as notebooks_in_folders
FROM public.notebook_entries;
