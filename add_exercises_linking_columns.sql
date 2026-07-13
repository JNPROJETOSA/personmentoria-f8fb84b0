-- MIGRAÇÃO: Adicionar class_id e block_name à tabela exercises
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS block_name text;

COMMENT ON COLUMN public.exercises.class_id IS 'ID da aula ou conteúdo relacionado';
COMMENT ON COLUMN public.exercises.block_name IS 'Nome opcional dado ao bloco de questões pelo aluno';
