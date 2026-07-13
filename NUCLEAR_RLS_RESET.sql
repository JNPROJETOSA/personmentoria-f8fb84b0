-- ====================================================================
-- ⚡ NUCLEAR RLS RESET - VERSÃO FINAL COM COLUNAS CORRETAS
-- Baseado no diagnóstico real das colunas de cada tabela.
-- ====================================================================

-- ============================
-- PROFILES (usa: id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Allow insert own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profile_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profile_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profile_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profile_select_admin" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','mentor'))
);
CREATE POLICY "profile_update_admin" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================
-- CLASSES (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own classes" ON public.classes;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes_all" ON public.classes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- EXERCISES (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own exercises" ON public.exercises;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises_all" ON public.exercises FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- EXAMS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own exams" ON public.exams;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exams_all" ON public.exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- EXAM SESSIONS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own exam sessions" ON public.exam_sessions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam_sessions_all" ON public.exam_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- REVIEWS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own reviews" ON public.reviews;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_all" ON public.reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- FLASHCARDS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own flashcards" ON public.flashcards;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcards_all" ON public.flashcards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- FLASHCARD FOLDERS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own flashcard folders" ON public.flashcard_folders;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.flashcard_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcard_folders_all" ON public.flashcard_folders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- FLASHCARD REVIEWS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own flashcard reviews" ON public.flashcard_reviews;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcard_reviews_all" ON public.flashcard_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- FLASHCARD STUDY SESSIONS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own flashcard study sessions" ON public.flashcard_study_sessions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.flashcard_study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcard_sessions_all" ON public.flashcard_study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- GOALS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_all" ON public.goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- NOTEBOOK ENTRIES (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own notebook entries" ON public.notebook_entries;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.notebook_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notebook_entries_all" ON public.notebook_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- NOTEBOOK FOLDERS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own notebook folders" ON public.notebook_folders;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.notebook_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notebook_folders_all" ON public.notebook_folders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- DREAM BOARD ITEMS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own dream board items" ON public.dream_board_items;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.dream_board_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dream_board_all" ON public.dream_board_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- BURNOUT CHECKINS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own burnout checkins" ON public.burnout_checkins;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.burnout_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "burnout_all" ON public.burnout_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- EDITORIALS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own editorials" ON public.editorials;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.editorials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editorials_all" ON public.editorials FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- EDITORIAL PROGRESS (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own editorial progress" ON public.editorial_progress;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.editorial_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "editorial_progress_all" ON public.editorial_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- STUDY ACTIVITY LOG (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own study activity" ON public.study_activity_log;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.study_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_activity_all" ON public.study_activity_log FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- WEEKLY AGENDA (usa: user_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage their own weekly agenda" ON public.weekly_agenda;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.weekly_agenda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_agenda_all" ON public.weekly_agenda FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================
-- PDF FILES (sem user_id - acesso público para autenticados)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can access pdf files" ON public.pdf_files;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.pdf_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_files_auth" ON public.pdf_files FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================
-- PDF FOLDERS (sem user_id - acesso público para autenticados)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can access pdf folders" ON public.pdf_folders;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.pdf_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_folders_auth" ON public.pdf_folders FOR ALL USING (auth.uid() IS NOT NULL);

-- ============================
-- STUDY STRATEGIES (usa: student_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "All authenticated users can access study strategies" ON public.study_strategies;
  DROP POLICY IF EXISTS "Admins can manage study strategies" ON public.study_strategies;
  DROP POLICY IF EXISTS "Students can view own study strategies" ON public.study_strategies;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.study_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "study_strategies_student" ON public.study_strategies FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "study_strategies_admin" ON public.study_strategies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','mentor'))
);

-- ============================
-- NOTIFICATIONS (usa: student_id, sender_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Student view own notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Admins/Mentors view all notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Admins/Mentors insert notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Admins/Mentors delete notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
  DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT USING (
  auth.uid() = student_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','mentor'))
);
CREATE POLICY "notifications_admin_all" ON public.notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','mentor'))
);

-- ============================
-- MEETING SLOTS (usa: mentor_id, student_id)
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "All can view meeting slots" ON public.meeting_slots;
  DROP POLICY IF EXISTS "Mentors manage meeting slots" ON public.meeting_slots;
  DROP POLICY IF EXISTS "All authenticated users can view meeting slots" ON public.meeting_slots;
  DROP POLICY IF EXISTS "Students can book meeting slots" ON public.meeting_slots;
  DROP POLICY IF EXISTS "Admins and mentors manage meeting slots" ON public.meeting_slots;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.meeting_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meeting_slots_view" ON public.meeting_slots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "meeting_slots_book" ON public.meeting_slots FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "meeting_slots_admin" ON public.meeting_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','mentor'))
);

-- ============================
-- ADMIN WHITELIST
-- ============================
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage whitelist" ON public.admin_whitelist;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "whitelist_admin" ON public.admin_whitelist FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================
-- GRANTS GLOBAIS
-- ============================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================
-- RESTAURAR ADMIN
-- ============================
UPDATE public.profiles SET role = 'admin' WHERE email IN ('jotajoao29@gmail.com', 'famulape@gmail.com');
INSERT INTO public.admin_whitelist (email, role) VALUES ('jotajoao29@gmail.com', 'admin') ON CONFLICT (email) DO UPDATE SET role = 'admin';
INSERT INTO public.admin_whitelist (email, role) VALUES ('famulape@gmail.com', 'admin') ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- CRIAR PERFIL DO LORENZO SE NÃO EXISTIR
INSERT INTO public.profiles (id, user_id, email, role, name, xp, level)
SELECT id, id, email, 'student', COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 0, 1
FROM auth.users WHERE email = 'lorenzocchielle@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- ============================
-- VERIFICAÇÃO FINAL
-- ============================
SELECT email, role, xp, level FROM public.profiles ORDER BY role, email;
