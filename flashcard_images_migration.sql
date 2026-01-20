-- =====================================================
-- Flashcard Images Migration
-- =====================================================
-- Adds support for image attachments in flashcard answers
-- Limit: 200KB per image
-- =====================================================

-- Add answer_image_url column to flashcards table
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS answer_image_url text;

COMMENT ON COLUMN public.flashcards.answer_image_url IS 'URL/path to answer image in storage (max 200KB)';

-- Success message
SELECT 'Flashcard images column added successfully!' as message;
