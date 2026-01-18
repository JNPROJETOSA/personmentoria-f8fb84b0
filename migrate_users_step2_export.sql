-- STEP 2: Export User Data from OLD Project
-- Execute this in OLD project (fbgthgtpjogtgmyorsft)

-- Export profiles data for the 4 users
SELECT 
  id,
  user_id,
  email,
  role,
  full_name,
  name,
  xp,
  level,
  streak,
  last_study_date,
  frozen,
  created_at
FROM public.profiles
WHERE email IN (
  'mmilenaggomes@gmail.com',
  'famulape@gmail.com',
  'jotajoao29@gmail.com',
  'joaovilelaestudos@gmail.com'
)
ORDER BY email;

-- Export any exercise logs (if table exists)
-- SELECT * FROM public.exercise_logs 
-- WHERE user_id IN (
--   SELECT id FROM public.profiles WHERE email IN (
--     'mmilenaggomes@gmail.com',
--     'famulape@gmail.com',
--     'jotajoao29@gmail.com',
--     'joaovilelaestudos@gmail.com'
--   )
-- );

-- Export any other user-specific data
-- Check what tables exist first:
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = t.table_name 
   AND column_name IN ('user_id', 'email')) as has_user_column
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
