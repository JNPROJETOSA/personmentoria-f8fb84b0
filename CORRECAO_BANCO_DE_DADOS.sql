-- EXECUTAR NO SUPABASE SQL EDITOR
-- Link: https://supabase.com/dashboard/project/jibsgrfzrkviffcignsm/sql/new

-- Adiciona a coluna de data (ESSENCIAL para o funcionamento)
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- Adiciona a coluna de prioridade
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 2;

-- Adiciona a coluna de concluído
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT TRUE;

-- Atualiza registros antigos se existirem (para não ficarem com data nula)
UPDATE reviews 
SET date = CURRENT_DATE 
WHERE date IS NULL;
