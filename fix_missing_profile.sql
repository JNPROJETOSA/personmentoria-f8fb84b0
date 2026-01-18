-- CRITICAL FIX: Create Missing Profile for Authenticated User
-- Project: fbgthgtpjogtgmyorsft
-- User: jotajoao29@gmail.com

-- This script creates the missing profile row that links the authenticated user to the database

-- Step 1: Find the user's UUID from auth.users
DO $$
DECLARE
    user_uuid uuid;
    user_email text := 'jotajoao29@gmail.com';
BEGIN
    -- Get the user's ID from auth.users
    SELECT id INTO user_uuid 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User % not found in auth.users', user_email;
    END IF;
    
    RAISE NOTICE 'Found user ID: %', user_uuid;
    
    -- Step 2: Create or update the profile
    INSERT INTO public.profiles (
        id,
        user_id,
        email,
        role,
        full_name,
        name,
        xp,
        level,
        streak,
        frozen
    )
    VALUES (
        user_uuid,
        user_uuid,
        user_email,
        'admin',
        'João Vilela',
        'João Vilela',
        0,
        1,
        0,
        false
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'admin',
        user_id = EXCLUDED.user_id,
        full_name = EXCLUDED.full_name,
        name = EXCLUDED.name;
    
    -- Step 3: Ensure whitelist entry exists
    INSERT INTO public.admin_whitelist (email, role)
    VALUES (user_email, 'admin')
    ON CONFLICT (email) DO UPDATE SET role = 'admin';
    
    RAISE NOTICE 'Profile created/updated successfully for %', user_email;
END $$;

-- Verification: Check the results
SELECT 
    'auth.users' as source,
    id,
    email
FROM auth.users 
WHERE email = 'jotajoao29@gmail.com'

UNION ALL

SELECT 
    'profiles' as source,
    id,
    email
FROM public.profiles 
WHERE email = 'jotajoao29@gmail.com';
