-- Create editorials table to store multiple editorials per user
CREATE TABLE public.editorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.editorials ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own editorials" 
ON public.editorials 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own editorials" 
ON public.editorials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own editorials" 
ON public.editorials 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own editorials" 
ON public.editorials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add editorial_id column to editorial_progress table
ALTER TABLE public.editorial_progress 
ADD COLUMN editorial_id UUID REFERENCES public.editorials(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX idx_editorial_progress_editorial ON public.editorial_progress(editorial_id);
CREATE INDEX idx_editorials_user ON public.editorials(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_editorials_updated_at
BEFORE UPDATE ON public.editorials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();