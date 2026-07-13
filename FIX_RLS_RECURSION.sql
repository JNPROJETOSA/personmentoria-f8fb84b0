-- ====================================================================
-- 🔧 FIX DEFINITIVO: QUEBRAR RECURSÃO NO RLS DE PROFILES
-- ====================================================================
-- A política "profile_select_admin" causava recursão infinita:
-- PostgreSQL tentava verificar admin → consultava profiles → precisava 
-- verificar admin → consulta profiles → loop infinito → retorna null.
-- Fix: usar função SECURITY DEFINER que bypassa o RLS.
-- ====================================================================

-- 1. REMOVER TODAS AS POLÍTICAS PROBLEMÁTICAS DE PROFILES
DROP POLICY IF EXISTS "profile_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profile_select_admin" ON public.profiles;
DROP POLICY IF EXISTS "profile_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert own profile" ON public.profiles;

-- 2. CRIAR FUNÇÃO SECURITY DEFINER (bypassa RLS - sem recursão)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. RECRIAR POLÍTICAS USANDO A FUNÇÃO (sem recursão)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuário vê/edita seu próprio perfil
CREATE POLICY "own_profile_select" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "own_profile_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "own_profile_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin/Mentor vê todos os perfis (usando função SECURITY DEFINER - sem recursão)
CREATE POLICY "admin_profiles_select" ON public.profiles
  FOR SELECT USING (public.get_my_role() IN ('admin', 'mentor'));

CREATE POLICY "admin_profiles_update" ON public.profiles
  FOR UPDATE USING (public.get_my_role() = 'admin');

-- 4. CORREÇÃO DO MESMO PROBLEMA NAS OUTRAS POLÍTICAS QUE USAM EXISTS(profiles)
-- Notificações
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_all" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (auth.uid() = student_id OR public.get_my_role() IN ('admin','mentor'));
CREATE POLICY "notifications_admin_all" ON public.notifications
  FOR ALL USING (public.get_my_role() IN ('admin','mentor'));

-- Study Strategies
DROP POLICY IF EXISTS "study_strategies_student" ON public.study_strategies;
DROP POLICY IF EXISTS "study_strategies_admin" ON public.study_strategies;
CREATE POLICY "study_strategies_student" ON public.study_strategies
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "study_strategies_admin" ON public.study_strategies
  FOR ALL USING (public.get_my_role() IN ('admin','mentor'));

-- Meeting Slots
DROP POLICY IF EXISTS "meeting_slots_admin" ON public.meeting_slots;
CREATE POLICY "meeting_slots_admin" ON public.meeting_slots
  FOR ALL USING (public.get_my_role() IN ('admin','mentor'));

-- Admin Whitelist
DROP POLICY IF EXISTS "whitelist_admin" ON public.admin_whitelist;
CREATE POLICY "whitelist_admin" ON public.admin_whitelist
  FOR ALL USING (public.get_my_role() = 'admin');

-- 5. GARANTIR ACESSO À FUNÇÃO
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 6. CONFIRMAR QUE SEU PERFIL ESTÁ CORRETO
UPDATE public.profiles SET role = 'admin' WHERE email IN ('jotajoao29@gmail.com', 'famulape@gmail.com');

-- 7. VERIFICAÇÃO
SELECT id, email, role, xp, level, name FROM public.profiles WHERE email = 'jotajoao29@gmail.com';
