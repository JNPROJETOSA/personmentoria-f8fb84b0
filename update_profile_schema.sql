-- Add new columns to profiles table for student personalization
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS exam_year text,
ADD COLUMN IF NOT EXISTS target_institutions text[],
ADD COLUMN IF NOT EXISTS target_specialty text;

-- Add comment to explain columns
COMMENT ON COLUMN public.profiles.exam_year IS 'Year the student intends to take the exam';
COMMENT ON COLUMN public.profiles.target_institutions IS 'List of institutions the student intends to apply to';
COMMENT ON COLUMN public.profiles.target_specialty IS 'Specialty the student intends to pursue';
