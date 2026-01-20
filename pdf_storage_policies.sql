-- =====================================================
-- Storage Bucket Policies for PDF Repository
-- =====================================================
-- Run this AFTER creating the 'pdfs' bucket in Supabase Storage
-- =====================================================

-- Allow everyone to download PDFs
CREATE POLICY "Public PDF Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'pdfs');

-- Only admins can upload
CREATE POLICY "Admin PDF Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdfs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Only admins can update
CREATE POLICY "Admin PDF Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pdfs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Only admins can delete
CREATE POLICY "Admin PDF Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdfs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- Bucket Configuration Instructions
-- =====================================================
-- 1. Go to Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Bucket name: pdfs
-- 4. Public: OFF (unchecked)
-- 5. File size limit: 50 MB
-- 6. Allowed MIME types: application/pdf
-- 7. Click "Create bucket"
-- 8. Run this SQL script in SQL Editor
