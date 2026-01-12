-- Add RLS policies for admins to manage user goals
CREATE POLICY "Admins can insert goals for any user"
ON public.goals
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update goals for any user"
ON public.goals
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete goals for any user"
ON public.goals
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));