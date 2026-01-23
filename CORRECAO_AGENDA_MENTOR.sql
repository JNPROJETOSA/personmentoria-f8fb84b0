-- =====================================================
-- CORREÇÃO DEFINITIVA: Políticas RLS para Agenda
-- =====================================================
-- Este script REMOVE todas as políticas antigas e recria
-- corretamente para alunos, mentores e administradores
-- =====================================================

-- PASSO 1: Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Users can view their own agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Users can insert their own agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Users can update their own agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Users can delete their own agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Users can manage their own weekly agenda" ON public.weekly_agenda;

DROP POLICY IF EXISTS "Admins can view all agendas" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Admins can insert agendas for any user" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Admins can update agendas for any user" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Admins can delete agendas for any user" ON public.weekly_agenda;

DROP POLICY IF EXISTS "Mentors can view all weekly_agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Mentors can insert weekly_agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Mentors can update weekly_agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Mentors can delete weekly_agenda" ON public.weekly_agenda;
DROP POLICY IF EXISTS "Mentors can manage all weekly_agenda" ON public.weekly_agenda;

-- PASSO 2: Criar função helper para verificar roles
CREATE OR REPLACE FUNCTION public.has_role_mentor_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('mentor', 'admin')
  )
$$;

-- PASSO 3: Criar políticas SELECT (visualização)
-- Alunos podem ver suas próprias agendas
CREATE POLICY "students_select_own_agenda"
ON public.weekly_agenda
FOR SELECT
USING (auth.uid() = user_id);

-- Mentores e admins podem ver todas as agendas
CREATE POLICY "mentors_admins_select_all_agendas"
ON public.weekly_agenda
FOR SELECT
USING (has_role_mentor_or_admin());

-- PASSO 4: Criar políticas INSERT (criação)
-- Alunos podem criar suas próprias agendas
CREATE POLICY "students_insert_own_agenda"
ON public.weekly_agenda
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Mentores e admins podem criar agendas para qualquer usuário
CREATE POLICY "mentors_admins_insert_any_agenda"
ON public.weekly_agenda
FOR INSERT
WITH CHECK (has_role_mentor_or_admin());

-- PASSO 5: Criar políticas UPDATE (atualização)
-- Alunos podem atualizar suas próprias agendas
CREATE POLICY "students_update_own_agenda"
ON public.weekly_agenda
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Mentores e admins podem atualizar qualquer agenda
CREATE POLICY "mentors_admins_update_any_agenda"
ON public.weekly_agenda
FOR UPDATE
USING (has_role_mentor_or_admin())
WITH CHECK (has_role_mentor_or_admin());

-- PASSO 6: Criar políticas DELETE (remoção)
-- Alunos podem deletar suas próprias agendas
CREATE POLICY "students_delete_own_agenda"
ON public.weekly_agenda
FOR DELETE
USING (auth.uid() = user_id);

-- Mentores e admins podem deletar qualquer agenda
CREATE POLICY "mentors_admins_delete_any_agenda"
ON public.weekly_agenda
FOR DELETE
USING (has_role_mentor_or_admin());

-- PASSO 7: Verificar políticas criadas
SELECT 
  schemaname as "Schema",
  tablename as "Tabela",
  policyname as "Política",
  cmd as "Comando",
  CASE 
    WHEN policyname LIKE '%student%' THEN '👨‍🎓 Aluno'
    WHEN policyname LIKE '%mentor%' OR policyname LIKE '%admin%' THEN '👨‍🏫 Mentor/Admin'
    ELSE '❓ Outro'
  END as "Tipo"
FROM pg_policies 
WHERE tablename = 'weekly_agenda'
ORDER BY policyname;

-- Mensagem de sucesso
SELECT '✅ Políticas RLS recriadas com sucesso! Mentores e admins agora podem gerenciar agendas de alunos.' as "Status";
