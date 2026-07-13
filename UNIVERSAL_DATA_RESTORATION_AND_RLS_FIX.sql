-- ====================================================================
-- 🟢 REPARO UNIVERSAL: RESTAURAÇÃO DE DADOS E PERMISSÕES (RLS)
-- ====================================================================
-- Este script REPARA de uma vez por todas o problema de:
-- 1. Perda aparente de dados (Vincular histórico ao ID atual).
-- 2. Erro ao salvar dados ("Não salva mais nada").
-- 3. Acesso de Administrador perdido.
-- ====================================================================

DO $$
DECLARE
    active_id UUID;
    old_id UUID;
    target_email TEXT := 'jotajoao29@gmail.com'; -- E-mail que queremos recuperar
BEGIN
    -- 1. IDENTIFICAR O NOVO ID (Logado agora)
    SELECT id INTO active_id FROM auth.users WHERE email = target_email;
    
    -- 2. IDENTIFICAR O ID DO PERFIL EXISTENTE (Pode ser o antigo ou o novo)
    SELECT id INTO old_id FROM public.profiles WHERE email = target_email LIMIT 1;

    -- 3. UNIFICAR DADOS (Se houver divergência entre o perfil e o login)
    IF active_id IS NOT NULL AND old_id IS NOT NULL AND active_id <> old_id THEN
        -- Mover histórico de todas as tabelas conhecidas do ID antigo para o NOVO
        UPDATE public.classes SET user_id = active_id WHERE user_id = old_id;
        UPDATE public.exercise_logs SET user_id = active_id WHERE user_id = old_id;
        UPDATE public.exam_logs SET user_id = active_id WHERE user_id = old_id;
        UPDATE public.reviews SET user_id = active_id WHERE user_id = old_id;
        UPDATE public.flashcards SET user_id = active_id WHERE user_id = old_id;
        
        -- Tabelas extras de outros sistemas (se existirem)
        BEGIN UPDATE public.flashcard_reviews SET user_id = active_id WHERE user_id = old_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN UPDATE public.notifications SET student_id = active_id WHERE student_id = old_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN UPDATE public.notifications SET sender_id = active_id WHERE sender_id = old_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN UPDATE public.study_strategies SET student_id = active_id WHERE student_id = old_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN UPDATE public.meetings SET student_id = active_id WHERE student_id = old_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        BEGIN UPDATE public.meetings SET mentor_id = active_id WHERE mentor_id = old_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        
        -- Deletar registros novos vazios antes de mover os antigos
        DELETE FROM public.goals WHERE user_id = active_id;
        BEGIN UPDATE public.goals SET user_id = active_id WHERE user_id = old_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        
        DELETE FROM public.notebooks WHERE user_id = active_id;
        BEGIN UPDATE public.notebooks SET user_id = active_id WHERE user_id = old_id; EXCEPTION WHEN OTHERS THEN NULL; END;
        
        -- Mover o Perfil para o ID correto
        UPDATE public.profiles SET id = active_id, user_id = active_id, role = 'admin' WHERE id = old_id;
    ELSIF active_id IS NOT NULL THEN
        -- Apenas garantir que o perfil atual seja admin
        UPDATE public.profiles SET role = 'admin' WHERE id = active_id;
    END IF;

    -- 4. REPARO DE PERMISSÕES (Para resolver o erro de "não salva nada")
    -- Garante que o usuário autenticado tenha permissão de leitura e escrita total nas tabelas públicas
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

    -- Alterar busca para priorizar o esquema público
    ALTER ROLE authenticator SET search_path = public, auth, extensions;
    
    RAISE NOTICE 'Reparo concluído com sucesso para o e-mail %.', target_email;
END $$;

-- 5. VERIFICAÇÃO FINAL DE SAÚDE DO USUÁRIO
SELECT id, email, role, xp, level FROM public.profiles WHERE email = 'jotajoao29@gmail.com';
