-- Add unique constraint for user_id and specialty combination in notebook_entries
-- This allows proper upsert functionality (insert or update)
ALTER TABLE public.notebook_entries
ADD CONSTRAINT notebook_entries_user_id_specialty_key UNIQUE (user_id, specialty);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notebook_entries_user_specialty 
ON public.notebook_entries(user_id, specialty);