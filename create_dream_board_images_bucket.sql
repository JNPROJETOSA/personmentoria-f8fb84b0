-- =====================================================
-- Create Dream Board Images Storage Bucket & Policies
-- =====================================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dream-board-images',
  'dream-board-images',
  false, -- Private bucket
  204800, -- 200 KB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS (Usually already enabled for storage.objects, but good practice to ensure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Allow authenticated users to view dream board images
DROP POLICY IF EXISTS "Authenticated users can view dream board images" ON storage.objects;
CREATE POLICY "Authenticated users can view dream board images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'dream-board-images');

-- Allow users to upload their own images
-- Logic: The folder name must match the User ID (e.g. 'user_id/image.png')
DROP POLICY IF EXISTS "Users can upload dream board images" ON storage.objects;
CREATE POLICY "Users can upload dream board images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dream-board-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own images
DROP POLICY IF EXISTS "Users can update own dream board images" ON storage.objects;
CREATE POLICY "Users can update own dream board images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dream-board-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images
DROP POLICY IF EXISTS "Users can delete own dream board images" ON storage.objects;
CREATE POLICY "Users can delete own dream board images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dream-board-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Success message
SELECT 'Bucket and Policies for "dream-board-images" created successfully!' as message;
