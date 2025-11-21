-- Add invite codes table
CREATE TABLE public.invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage invite codes (for now, we'll create them manually)
CREATE POLICY "Anyone can view active invite codes"
  ON public.invite_codes FOR SELECT
  USING (active = true AND (expires_at IS NULL OR expires_at > now()));

-- Function to validate invite code during signup
CREATE OR REPLACE FUNCTION public.validate_invite_code(code_input TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
BEGIN
  SELECT * INTO code_record
  FROM public.invite_codes
  WHERE code = code_input
    AND active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF code_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Increment usage count
  UPDATE public.invite_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;
  
  RETURN true;
END;
$$;

-- Insert some initial invite codes (você pode mudar esses códigos)
INSERT INTO public.invite_codes (code, max_uses, active)
VALUES
  ('PERRYMED2024', 100, true),
  ('RESIDENCIA2024', 50, true),
  ('ESTUDANTE', NULL, true); -- Código ilimitado