-- STEP 1: Add Users to Whitelist in NEW Project
-- Execute this in NEW project (jibsgrfzrkviffcignsm)

-- Add all 4 users to the whitelist
INSERT INTO public.admin_whitelist (email, role) VALUES 
  ('mmilenaggomes@gmail.com', 'student'),
  ('famulape@gmail.com', 'admin'),
  ('jotajoao29@gmail.com', 'admin'),
  ('joaovilelaestudos@gmail.com', 'student')
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role;

-- Verify whitelist
SELECT * FROM public.admin_whitelist 
WHERE email IN (
  'mmilenaggomes@gmail.com',
  'famulape@gmail.com',
  'jotajoao29@gmail.com',
  'joaovilelaestudos@gmail.com'
)
ORDER BY email;
