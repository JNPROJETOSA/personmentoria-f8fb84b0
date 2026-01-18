-- EXPORT DATA FROM OLD PROJECT (fbgthgtpjogtgmyorsft)
-- Execute this in the SQL Editor of the OLD project to get the data

-- 1. Get User Profile Data
SELECT 
  email,
  role,
  full_name,
  name,
  xp,
  level,
  streak,
  classesStudied,
  total_activities,
  total_accuracy,
  created_at
FROM public.profiles
WHERE email IN (
  'mmilenaggomes@gmail.com',
  'famulape@gmail.com',
  'jotajoao29@gmail.com',
  'joaovilelaestudos@gmail.com'
);

-- 2. Get Exercise History (if exists)
-- SELECT * FROM public.exercise_logs WHERE user_id IN (...);
