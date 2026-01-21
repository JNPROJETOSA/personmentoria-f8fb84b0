-- MIGRAÇÃO: Renomear "Medicina Preventiva" para "Preventiva" (CORRIGIDO)
-- Executar no Supabase SQL Editor para atualizar os registros existentes

-- 1. Tabela reviews (coluna 'area')
UPDATE reviews 
SET area = 'Preventiva' 
WHERE area = 'Medicina Preventiva';

-- 2. Tabela classes (coluna 'specialty')
UPDATE classes 
SET specialty = 'Preventiva' 
WHERE specialty = 'Medicina Preventiva';

-- 3. Tabela exercises (coluna 'specialty')
UPDATE exercises 
SET specialty = 'Preventiva' 
WHERE specialty = 'Medicina Preventiva';

-- 4. Tabela flashcards (coluna 'area')
UPDATE flashcards 
SET area = 'Preventiva' 
WHERE area = 'Medicina Preventiva';

-- 5. Confirmação
SELECT 'Migração concluída: Medicina Preventiva -> Preventiva' as status;
