-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on profiles to allow admin access
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on exercises to allow admin access
CREATE POLICY "Admins can view all exercises"
ON public.exercises
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on exams to allow admin access
CREATE POLICY "Admins can view all exams"
ON public.exams
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on classes to allow admin access
CREATE POLICY "Admins can view all classes"
ON public.classes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on reviews to allow admin access
CREATE POLICY "Admins can view all reviews"
ON public.reviews
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on flashcards to allow admin access
CREATE POLICY "Admins can view all flashcards"
ON public.flashcards
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on burnout_checkins to allow admin access
CREATE POLICY "Admins can view all burnout checkins"
ON public.burnout_checkins
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on editorial_progress to allow admin access
CREATE POLICY "Admins can view all editorial progress"
ON public.editorial_progress
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on editorials to allow admin access
CREATE POLICY "Admins can view all editorials"
ON public.editorials
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on goals to allow admin access
CREATE POLICY "Admins can view all goals"
ON public.goals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on exam_sessions to allow admin access
CREATE POLICY "Admins can view all exam sessions"
ON public.exam_sessions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on notebook_entries to allow admin access
CREATE POLICY "Admins can view all notebook entries"
ON public.notebook_entries
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies on dream_board_items to allow admin access
CREATE POLICY "Admins can view all dream board items"
ON public.dream_board_items
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));