
-- Fix reviews table schema
-- Add missing columns if they don't exist

DO $$
BEGIN
    -- Add date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'date') THEN
        ALTER TABLE public.reviews ADD COLUMN date DATE;
    END IF;

    -- Add completed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'completed') THEN
        ALTER TABLE public.reviews ADD COLUMN completed BOOLEAN DEFAULT false;
    END IF;

    -- Add priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'priority') THEN
        ALTER TABLE public.reviews ADD COLUMN priority INTEGER DEFAULT 1;
    END IF;
END $$;
