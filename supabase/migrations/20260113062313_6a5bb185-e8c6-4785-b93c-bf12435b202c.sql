-- Add column to track completed tasks (stores indices of completed tasks)
ALTER TABLE public.weekly_agenda 
ADD COLUMN completed_indices integer[] DEFAULT '{}'::integer[];