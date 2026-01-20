-- =====================================================
-- Create Storage Bucket for PDFs
-- =====================================================
-- This script creates the 'pdfs' storage bucket
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs',
  'pdfs',
  false,
  52428800, -- 50 MB in bytes
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Bucket "pdfs" criado com sucesso!' as message;
