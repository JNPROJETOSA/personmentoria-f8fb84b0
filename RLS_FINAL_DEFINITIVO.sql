-- ====================================================================
-- ⚡ SCRIPT FINAL DEFINITIVO - RLS CORRETO PARA TODOS OS CASOS
-- ====================================================================
-- Estratégia:
-- 1. get_my_role() = função SECURITY DEFINER (sem recursão, bypassa RLS)
-- 2. Alunos: só veem seus próprios dados (auth.uid() = user_id)
-- 3. Admin/Mentor: veem TODOS os dados (necessário para dashboard admin)
-- ====================================================================

-- PASSO 1: CRIAR/ATUALIZAR FUNÇÃO SEM RECURSÃO
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, anon;

-- TESTE NECESSÁRIO: A função deve retornar algo para usuários logados.
-- SELECT public.get_my_role(); -- Descomente para testar manualmente

-- ====================================================================
-- PASSO 2: REMOVER TODAS AS POLÍTICAS EXISTENTES (LIMPEZA TOTAL)
-- ====================================================================

-- profiles
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.profiles';
  END LOOP;
END $$;

-- classes
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'classes' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.classes';
  END LOOP;
END $$;

-- exercises
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'exercises' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.exercises';
  END LOOP;
END $$;

-- exams
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'exams' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.exams';
  END LOOP;
END $$;

-- reviews
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'reviews' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.reviews';
  END LOOP;
END $$;

-- flashcards
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'flashcards' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.flashcards';
  END LOOP;
END $$;

-- goals
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'goals' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.goals';
  END LOOP;
END $$;

-- ====================================================================
-- PASSO 3: RECRIAR POLÍTICAS CORRETAS
-- ====================================================================

-- PROFILES: usuário vê próprio perfil + admin/mentor vê todos
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "p_select" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.get_my_role() IN ('admin', 'mentor'));

CREATE POLICY "p_update_own" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.get_my_role() = 'admin');

CREATE POLICY "p_insert_own" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- CLASSES
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "c_all" ON public.classes FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- EXERCISES
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "e_all" ON public.exercises FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- EXAMS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ex_all" ON public.exams FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- REVIEWS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "r_all" ON public.reviews FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- FLASHCARDS
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "f_all" ON public.flashcards FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- GOALS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "g_all" ON public.goals FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- FLASHCARD FOLDERS
ALTER TABLE public.flashcard_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ff_all" ON public.flashcard_folders FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- FLASHCARD REVIEWS
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr_all" ON public.flashcard_reviews FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- FLASHCARD STUDY SESSIONS
ALTER TABLE public.flashcard_study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fss_all" ON public.flashcard_study_sessions FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- NOTEBOOK ENTRIES
ALTER TABLE public.notebook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ne_all" ON public.notebook_entries FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- NOTEBOOK FOLDERS
ALTER TABLE public.notebook_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nf_all" ON public.notebook_folders FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- DREAM BOARD ITEMS
ALTER TABLE public.dream_board_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "db_all" ON public.dream_board_items FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- BURNOUT CHECKINS
ALTER TABLE public.burnout_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bc_all" ON public.burnout_checkins FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- EDITORIALS
ALTER TABLE public.editorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ed_all" ON public.editorials FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- EDITORIAL PROGRESS
ALTER TABLE public.editorial_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ep_all" ON public.editorial_progress FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- STUDY ACTIVITY LOG
ALTER TABLE public.study_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sal_all" ON public.study_activity_log FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- WEEKLY AGENDA
ALTER TABLE public.weekly_agenda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_all" ON public.weekly_agenda FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- EXAM SESSIONS
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "es_all" ON public.exam_sessions FOR ALL
  USING (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = user_id OR public.get_my_role() IN ('admin', 'mentor'));

-- PDF FILES (sem user_id, acesso por autenticados)
ALTER TABLE public.pdf_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pf_all" ON public.pdf_files FOR ALL USING (auth.uid() IS NOT NULL);

-- PDF FOLDERS (sem user_id, acesso por autenticados)
ALTER TABLE public.pdf_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pfold_all" ON public.pdf_folders FOR ALL USING (auth.uid() IS NOT NULL);

-- STUDY STRATEGIES (usa student_id)
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'study_strategies' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.study_strategies';
  END LOOP;
END $$;
ALTER TABLE public.study_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ss_all" ON public.study_strategies FOR ALL
  USING (auth.uid() = student_id OR public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (auth.uid() = student_id OR public.get_my_role() IN ('admin', 'mentor'));

-- NOTIFICATIONS (usa student_id)
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.notifications';
  END LOOP;
END $$;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ALTER COLUMN sender_id DROP NOT NULL;
CREATE POLICY "n_select" ON public.notifications FOR SELECT
  USING (auth.uid() = student_id OR public.get_my_role() IN ('admin', 'mentor'));
CREATE POLICY "n_admin" ON public.notifications FOR ALL
  USING (public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (public.get_my_role() IN ('admin', 'mentor'));

-- MEETING SLOTS (usa mentor_id / student_id)
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'meeting_slots' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.meeting_slots';
  END LOOP;
END $$;
ALTER TABLE public.meeting_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ms_view" ON public.meeting_slots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ms_admin" ON public.meeting_slots FOR ALL
  USING (public.get_my_role() IN ('admin', 'mentor'))
  WITH CHECK (public.get_my_role() IN ('admin', 'mentor'));
CREATE POLICY "ms_book" ON public.meeting_slots FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ADMIN WHITELIST
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'admin_whitelist' AND schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.admin_whitelist';
  END LOOP;
END $$;
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aw_admin" ON public.admin_whitelist FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ====================================================================
-- PASSO 4: GRANTS E CONFIRMAÇÃO
-- ====================================================================
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Confirmar admin
UPDATE public.profiles SET role = 'admin' WHERE email IN ('jotajoao29@gmail.com', 'famulape@gmail.com');

-- ====================================================================
-- VERIFICAÇÃO FINAL: Contar políticas criadas
-- ====================================================================
SELECT tablename, count(*) as num_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
