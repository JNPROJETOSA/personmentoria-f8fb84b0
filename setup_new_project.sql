-- COMPLETE DATABASE SETUP FOR NEW PROJECT
-- Project: jibsgrfzrkviffcignsm
-- This script creates all necessary tables, policies, and initial data

-- ============================================
-- 1. ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. CREATE TABLES
-- ============================================

-- Profiles Table (User Data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  full_name text,
  name text,
  xp integer DEFAULT 0,
  level integer DEFAULT 1,
  streak integer DEFAULT 0,
  last_study_date text,
  frozen boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin Whitelist Table
CREATE TABLE IF NOT EXISTS public.admin_whitelist (
  email text PRIMARY KEY,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'student')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by uuid REFERENCES auth.users(id)
);

-- ============================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Admin Whitelist Policies
DROP POLICY IF EXISTS "Admins can manage whitelist" ON public.admin_whitelist;
CREATE POLICY "Admins can manage whitelist"
  ON public.admin_whitelist FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

DROP POLICY IF EXISTS "Whitelist is viewable by admins" ON public.admin_whitelist;
CREATE POLICY "Whitelist is viewable by admins"
  ON public.admin_whitelist FOR SELECT
  USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- ============================================
-- 4. TRIGGER FUNCTION (Auto-create profiles)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  is_whitelisted boolean;
  user_role text;
BEGIN
  -- Check if email is in whitelist
  SELECT true, role INTO is_whitelisted, user_role
  FROM public.admin_whitelist
  WHERE email = new.email;

  IF is_whitelisted IS TRUE THEN
    -- Create profile
    INSERT INTO public.profiles (
      id, user_id, email, role, full_name, name, 
      xp, level, streak, frozen
    )
    VALUES (
      new.id, 
      new.id, 
      new.email, 
      user_role, 
      COALESCE(new.raw_user_meta_data->>'full_name', new.email),
      COALESCE(new.raw_user_meta_data->>'full_name', new.email),
      0, 1, 0, false
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
  ELSE
    -- Block signup if not whitelisted
    RAISE EXCEPTION 'Email not authorized by administrator.';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================
-- 5. INITIAL DATA (Admin Whitelist)
-- ============================================

INSERT INTO public.admin_whitelist (email, role) VALUES 
  ('jotajoao29@gmail.com', 'admin'),
  ('famulape@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- ============================================
-- 6. BACKFILL EXISTING USERS
-- ============================================

-- Create profiles for any existing authenticated users
INSERT INTO public.profiles (id, user_id, email, role, full_name, name, xp, level, streak, frozen)
SELECT 
  u.id, 
  u.id, 
  u.email, 
  COALESCE(w.role, 'student'),
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  0, 1, 0, false
FROM auth.users u
LEFT JOIN public.admin_whitelist w ON u.email = w.email
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- ============================================
-- 7. VERIFICATION
-- ============================================

SELECT 
  'Total Users in Auth' as metric,
  COUNT(*)::text as value
FROM auth.users

UNION ALL

SELECT 
  'Total Profiles Created' as metric,
  COUNT(*)::text as value
FROM public.profiles

UNION ALL

SELECT 
  'Admin Users' as metric,
  COUNT(*)::text as value
FROM public.profiles
WHERE role = 'admin'

UNION ALL

SELECT 
  'Whitelist Entries' as metric,
  COUNT(*)::text as value
FROM public.admin_whitelist;
