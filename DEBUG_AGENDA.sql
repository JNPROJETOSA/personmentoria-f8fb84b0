-- =====================================================
-- DEBUG: Verificar dados da agenda
-- =====================================================
-- Use este script para verificar se os dados estão sendo
-- salvos corretamente no banco de dados
-- =====================================================

-- 1. Verificar todas as políticas RLS da tabela weekly_agenda
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'weekly_agenda'
ORDER BY policyname;

-- 2.  Verificar todos os registros de agenda (sem filtro RLS - apenas para admin)
SET LOCAL ROLE postgres;  -- executa como superuser temporariamente
SELECT 
  id,
  user_id,
  week_start,
  day_of_week,
  tasks,
  completed_indices,
  created_at,
  updated_at
FROM public.weekly_agenda
ORDER BY week_start DESC, day_of_week ASC
LIMIT 50;
RESET ROLE;

-- 3 Contar agendas por usuário
SELECT 
  p.name as "Nome do Usuário",
  p.role as "Papel",
  COUNT(wa.id) as "Total de Registros na Agenda"
FROM public.profiles p
LEFT JOIN public.weekly_agenda wa ON p.user_id = wa.user_id
GROUP BY p.user_id, p.name, p.role
ORDER BY COUNT(wa.id) DESC;

-- 4. Verificar se há conflitos de unique constraint
SELECT 
  user_id,
  week_start,
  day_of_week,
  COUNT(*) as duplicatas
FROM public.weekly_agenda
GROUP BY user_id, week_start, day_of_week
HAVING COUNT(*) > 1;
