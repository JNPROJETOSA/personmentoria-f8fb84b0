-- ====================================================================
-- 🔍 PASSO 1: VER POLÍTICAS ATUAIS DO PROFILES
-- ====================================================================
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ====================================================================
-- ⚠️ PASSO 2: DESATIVAR RLS TEMPORARIAMENTE (TESTE)
-- Isso vai fazer TODOS os dados aparecerem no site imediatamente.
-- Se funcionar = confirmamos que é problema de RLS.
-- ====================================================================
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.dream_board_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.burnout_checkins DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_agenda DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;

SELECT 'RLS DESATIVADO - Teste o site agora' as status;
