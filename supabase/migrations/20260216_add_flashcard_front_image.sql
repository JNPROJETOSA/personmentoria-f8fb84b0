-- Add front_image_url column to flashcards table
-- This allows users to attach images to the front (question) side of flashcards
-- Nullable for backward compatibility with existing flashcards

ALTER TABLE flashcards 
ADD COLUMN IF NOT EXISTS front_image_url TEXT;

COMMENT ON COLUMN flashcards.front_image_url IS 'URL/path to image displayed on front (question) side of flashcard. Nullable for backward compatibility.';
