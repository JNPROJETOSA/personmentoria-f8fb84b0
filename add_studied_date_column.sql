-- ============================================
-- MIGRAÇÃO: Adicionar campo studied_date
-- ============================================
-- Objetivo: Registrar a data em que o aluno marcou a aula como estudada
-- Diferente de 'date' que é a data de cadastro da aula no sistema

-- 1. Adicionar coluna studied_date
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS studied_date timestamp with time zone;

-- 2. Migrar dados existentes
-- Para aulas já estudadas, assume que foram estudadas na data de cadastro
-- (melhor que deixar NULL e perder as revisões)
UPDATE public.classes 
SET studied_date = date 
WHERE studied = true AND studied_date IS NULL;

-- 3. Adicionar comentário para documentação
COMMENT ON COLUMN public.classes.studied_date IS 
'Data em que o aluno marcou a aula como estudada. Diferente de date que é a data de cadastro.';

-- 4. Verificação: Quantas aulas foram migradas
SELECT 
    COUNT(*) FILTER (WHERE studied = true AND studied_date IS NOT NULL) as aulas_estudadas_migradas,
    COUNT(*) FILTER (WHERE studied = false) as aulas_nao_estudadas,
    COUNT(*) as total_aulas
FROM public.classes;
