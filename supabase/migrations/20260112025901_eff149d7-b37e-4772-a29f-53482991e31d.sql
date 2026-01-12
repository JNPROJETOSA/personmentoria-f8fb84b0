-- Create weekly_agenda table for storing daily tasks
CREATE TABLE public.weekly_agenda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  tasks TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start, day_of_week)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_agenda ENABLE ROW LEVEL SECURITY;

-- Users can view their own agenda
CREATE POLICY "Users can view their own agenda"
ON public.weekly_agenda
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own agenda
CREATE POLICY "Users can insert their own agenda"
ON public.weekly_agenda
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own agenda
CREATE POLICY "Users can update their own agenda"
ON public.weekly_agenda
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own agenda
CREATE POLICY "Users can delete their own agenda"
ON public.weekly_agenda
FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all agendas
CREATE POLICY "Admins can view all agendas"
ON public.weekly_agenda
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert agendas for any user
CREATE POLICY "Admins can insert agendas for any user"
ON public.weekly_agenda
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update agendas for any user
CREATE POLICY "Admins can update agendas for any user"
ON public.weekly_agenda
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete agendas for any user
CREATE POLICY "Admins can delete agendas for any user"
ON public.weekly_agenda
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_weekly_agenda_updated_at
BEFORE UPDATE ON public.weekly_agenda
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();