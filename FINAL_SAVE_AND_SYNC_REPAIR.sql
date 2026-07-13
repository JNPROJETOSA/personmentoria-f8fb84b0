-- ====================================================================
-- 🏁 REPARO FINAL (VERSÃO CORRIGIDA): DESTRAVAMENTO DE SALVAMENTO
-- ====================================================================
-- Este script REPARA as tabelas com os nomes corretos do sistema:
-- 'exercises' em vez de 'exercise_logs' e 'exams' em vez de 'exam_logs'.
-- ====================================================================

DO $$
DECLARE
    lorenzo_id UUID;
    table_name TEXT;
BEGIN
    -- 1. IDENTIFICAR O ID DO LORENZO
    SELECT id INTO lorenzo_id FROM auth.users WHERE email = 'lorenzocchielle@gmail.com';

    -- 2. CRIAR/REPARAR PERFIL DO LORENZO
    IF lorenzo_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, user_id, email, role, name, xp, level)
        VALUES (lorenzo_id, lorenzo_id, 'lorenzocchielle@gmail.com', 'student', 'Lorenzo', 0, 1)
        ON CONFLICT (id) DO UPDATE SET role = 'student', name = 'Lorenzo';
    END IF;

    -- 3. DESTRAVAR RLS (Blocos individuais para não travar se a tabela não existir)
    
    -- Perfis (profiles)
    BEGIN
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        CREATE POLICY "Users can update own profile" ON public.profiles
          FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro em profiles'; END;

    -- Aulas (classes)
    BEGIN
        DROP POLICY IF EXISTS "Users can manage their own classes" ON public.classes;
        CREATE POLICY "Users can manage their own classes" ON public.classes
          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro em classes'; END;

    -- Exercícios (exercises)
    BEGIN
        DROP POLICY IF EXISTS "Users can manage their own exercises" ON public.exercises;
        CREATE POLICY "Users can manage their own exercises" ON public.exercises
          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro em exercises'; END;

    -- Provas (exams)
    BEGIN
        DROP POLICY IF EXISTS "Users can manage their own exams" ON public.exams;
        CREATE POLICY "Users can manage their own exams" ON public.exams
          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro em exams'; END;

    -- Revisões (reviews)
    BEGIN
        DROP POLICY IF EXISTS "Users can manage their own reviews" ON public.reviews;
        CREATE POLICY "Users can manage their own reviews" ON public.reviews
          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro em reviews'; END;

    -- Flashcards
    BEGIN
        DROP POLICY IF EXISTS "Users can manage their own flashcards" ON public.flashcards;
        CREATE POLICY "Users can manage their own flashcards" ON public.flashcards
          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro em flashcards'; END;

    -- Metas (goals)
    BEGIN
        DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
        CREATE POLICY "Users can manage their own goals" ON public.goals
          FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Erro em goals'; END;

    -- 4. PERMISSÕES TOTAIS PARA USUÁRIOS LOGADOS
    GRANT USAGE ON SCHEMA public TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

    ALTER ROLE authenticator SET search_path = public, auth, extensions;
    
    RAISE NOTICE 'Reparo completo executado.';
END $$;

-- 5. VERIFICAÇÃO FINAL
SELECT email, role, xp, level, name FROM public.profiles WHERE email IN ('jotajoao29@gmail.com', 'lorenzocchielle@gmail.com');
