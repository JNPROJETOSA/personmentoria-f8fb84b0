-- ============================================================
-- Migration: Add admin_origin columns to activity tables
-- Purpose: Allow admin-inserted academic history records to be
--          tracked while keeping them in the same tables as
--          student-created records for full system integration.
-- ============================================================

-- 1. exercises table
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS admin_origin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_inserted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_inserted_at TIMESTAMPTZ;

-- 2. exams table
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS admin_origin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_inserted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_inserted_at TIMESTAMPTZ;

-- 3. classes table
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS admin_origin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_inserted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_inserted_at TIMESTAMPTZ;

-- 4. reviews table
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS admin_origin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_inserted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS admin_inserted_at TIMESTAMPTZ;

-- Indexes for filtering admin-origin records efficiently
CREATE INDEX IF NOT EXISTS idx_exercises_admin_origin ON public.exercises(user_id, admin_origin) WHERE admin_origin = TRUE;
CREATE INDEX IF NOT EXISTS idx_exams_admin_origin ON public.exams(user_id, admin_origin) WHERE admin_origin = TRUE;
CREATE INDEX IF NOT EXISTS idx_classes_admin_origin ON public.classes(user_id, admin_origin) WHERE admin_origin = TRUE;
CREATE INDEX IF NOT EXISTS idx_reviews_admin_origin ON public.reviews(user_id, admin_origin) WHERE admin_origin = TRUE;
