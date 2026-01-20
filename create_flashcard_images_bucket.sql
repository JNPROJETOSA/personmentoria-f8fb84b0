-- =====================================================
-- Create Flashcard Images Storage Bucket
-- =====================================================
-- Creates bucket for flashcard answer images
-- =====================================================

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flashcard-images',
  'flashcard-images',
  false, -- Private bucket
  204800, -- 200 KB in bytes
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Bucket "flashcard-images" created successfully!' as message;
