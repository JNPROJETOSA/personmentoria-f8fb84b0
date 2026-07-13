-- ====================================================================
-- 🚨 RECUPERAÇÃO DE EMERGÊNCIA: RESTAURAÇÃO DE DADOS E HISTÓRICO
-- ====================================================================
-- Este script REVERTE a perda aparente de dados, movendo todo o progresso
-- (XP, Nível, Exercícios, Aulas) de registros antigos para o seu login atual.
-- ====================================================================

DO $$
DECLARE
    new_id UUID;
    old_id UUID;
    target_email TEXT := 'jotajoao29@gmail.com'; -- Altere para o seu email se necessário
BEGIN
    -- 1. IDENTIFICAR O NOVO ID (O que você está usando agora)
    SELECT id INTO new_id FROM auth.users WHERE email = target_email;
    
    -- 2. IDENTIFICAR O ID ANTIGO (Aquele que renomeamos e que contém os dados)
    SELECT id INTO old_id FROM public.profiles 
    WHERE email LIKE target_email || '_old_%' 
    ORDER BY created_at DESC LIMIT 1;

    IF new_id IS NOT NULL AND old_id IS NOT NULL THEN
        -- 3. TRANSFERIR PROGRESSO NO PERFIL (XP, Nível, Streak)
        UPDATE public.profiles p_new
        SET 
            xp = p_old.xp,
            level = p_old.level,
            streak = p_old.streak,
            last_study_date = p_old.last_study_date,
            name = COALESCE(p_new.name, p_old.name),
            role = 'admin'
        FROM public.profiles p_old
        WHERE p_new.id = new_id AND p_old.id = old_id;

        -- 4. TRANSFERIR TODOS OS REGISTROS DE ATIVIDADES (Mudando a dona dos dados)
        
        -- Classes, Exercícios, Provas, Revisões
        UPDATE public.classes SET user_id = new_id WHERE user_id = old_id;
        UPDATE public.exercise_logs SET user_id = new_id WHERE user_id = old_id;
        UPDATE public.exam_logs SET user_id = new_id WHERE user_id = old_id;
        UPDATE public.reviews SET user_id = new_id WHERE user_id = old_id;
        UPDATE public.flashcards SET user_id = new_id WHERE user_id = old_id;
        
        -- Flashcard Reviews (pode estar em outra tabela)
        BEGIN
            UPDATE public.flashcard_reviews SET user_id = new_id WHERE user_id = old_id;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        -- Metas (Goals - Deletar a nova vazia antes de mover a antiga)
        DELETE FROM public.goals WHERE user_id = new_id;
        UPDATE public.goals SET user_id = new_id WHERE user_id = old_id;

        -- Caderno de Erros (Notebooks)
        DELETE FROM public.notebooks WHERE user_id = new_id;
        UPDATE public.notebooks SET user_id = new_id WHERE user_id = old_id;

        -- Mural dos Sonhos (Dream Board)
        UPDATE public.dream_board SET user_id = new_id WHERE user_id = old_id;

        -- Notificações
        UPDATE public.notifications SET student_id = new_id WHERE student_id = old_id;
        UPDATE public.notifications SET sender_id = new_id WHERE sender_id = old_id;

        -- Reuniões e Estratégias
        BEGIN
            UPDATE public.study_strategies SET student_id = new_id WHERE student_id = old_id;
            UPDATE public.meetings SET student_id = new_id WHERE student_id = old_id;
            UPDATE public.meetings SET mentor_id = new_id WHERE mentor_id = old_id;
        EXCEPTION WHEN OTHERS THEN NULL; END;

        -- 5. LIMPEZA (Remover o perfil antigo que agora está vazio)
        DELETE FROM public.profiles WHERE id = old_id;

        RAISE NOTICE 'DADOS RESTAURADOS COM SUCESSO DE % PARA %', old_id, new_id;
    ELSE
        RAISE EXCEPTION 'Não foi possível encontrar o ID novo (%) ou o histórico antigo (%).', new_id, old_id;
    END IF;
END $$;

-- VERIFICAÇÃO FINAL
SELECT email, role, xp, level, streak FROM public.profiles WHERE email = 'jotajoao29@gmail.com';
