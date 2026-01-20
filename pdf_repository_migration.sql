-- =====================================================
-- PDF Repository System Migration
-- =====================================================
-- This script creates the necessary tables and policies
-- for the PDF repository feature.
-- =====================================================

-- Create PDF Folders Table
CREATE TABLE IF NOT EXISTS public.pdf_folders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create PDF Files Table
CREATE TABLE IF NOT EXISTS public.pdf_files (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id uuid REFERENCES public.pdf_folders(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_files ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies for pdf_folders
-- =====================================================

-- Everyone can view folders
CREATE POLICY "Everyone can view folders" ON public.pdf_folders
  FOR SELECT USING (true);

-- Only admins can insert folders
CREATE POLICY "Only admins can insert folders" ON public.pdf_folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update folders
CREATE POLICY "Only admins can update folders" ON public.pdf_folders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete folders
CREATE POLICY "Only admins can delete folders" ON public.pdf_folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- RLS Policies for pdf_files
-- =====================================================

-- Everyone can view files
CREATE POLICY "Everyone can view files" ON public.pdf_files
  FOR SELECT USING (true);

-- Only admins can insert files
CREATE POLICY "Only admins can insert files" ON public.pdf_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update files
CREATE POLICY "Only admins can update files" ON public.pdf_files
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete files
CREATE POLICY "Only admins can delete files" ON public.pdf_files
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_pdf_files_folder_id ON public.pdf_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_pdf_folders_created_at ON public.pdf_folders(created_at DESC);

-- =====================================================
-- Success Message
-- =====================================================
-- Migration completed successfully!
-- Next steps:
-- 1. Create storage bucket 'pdfs' in Supabase Storage
-- 2. Run storage_policies.sql to set up bucket policies
