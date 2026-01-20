-- =====================================================
-- Storage Policies for Flashcard Images (FIXED)
-- =====================================================
-- Removes old policies and creates new ones
-- =====================================================

-- 1. DROP old policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view flashcard images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload flashcard images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own flashcard images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own flashcard images" ON storage.objects;

-- 2. CREATE new policies

-- Allow authenticated users to view flashcard images
CREATE POLICY "Authenticated users can view flashcard images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'flashcard-images');

-- Allow users to upload their own flashcard images
CREATE POLICY "Users can upload flashcard images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'flashcard-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own flashcard images
CREATE POLICY "Users can update own flashcard images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'flashcard-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own flashcard images
CREATE POLICY "Users can delete own flashcard images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'flashcard-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Verify policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%flashcard%'
ORDER BY policyname;
