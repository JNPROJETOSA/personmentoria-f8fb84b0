-- ADICIONAR COLUNA AREA NA TABELA REVIEWS
-- Link: https://supabase.com/dashboard/project/jibsgrfzrkviffcignsm/sql/new

ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'Geral';

-- Atualiza registros existentes
UPDATE reviews 
SET area = 'Geral' 
WHERE area IS NULL;
