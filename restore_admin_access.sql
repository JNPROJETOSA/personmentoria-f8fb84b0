-- Safe Admin Access Restoration Script
-- Project: fbgthgtpjogtgmyorsft
-- User: jotajoao29@gmail.com

-- This script safely restores admin access without deleting any data

-- 1. Add email to admin whitelist (if not already there)
INSERT INTO public.admin_whitelist (email, role)
VALUES ('jotajoao29@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- 2. Update user profile to admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email ILIKE 'jotajoao29@gmail.com';

-- 3. Verify the changes
SELECT 
    'Admin Whitelist' as table_name,
    email,
    role
FROM public.admin_whitelist 
WHERE email ILIKE 'jotajoao29@gmail.com'

UNION ALL

SELECT 
    'Profiles' as table_name,
    email,
    role
FROM public.profiles 
WHERE email ILIKE 'jotajoao29@gmail.com';
