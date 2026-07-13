-- ====================================================================
-- 🧼 LIMPEZA FINAL: MÉTODO CIRÚRGICO (SEM DELETAR PERFIS)
-- ====================================================================
-- Este script evita o erro de "ForeignKey" (23503) pois não apaga perfis. 
-- Ele apenas libera o seu e-mail do registro antigo para o novo.
-- ====================================================================

-- 1. CORREÇÃO DA TABELA DE NOTIFICAÇÕES (Garante que não haverá travamentos por nulos)
ALTER TABLE public.notifications ALTER COLUMN sender_id DROP NOT NULL;

-- 2. FUNÇÃO ESPECIAL PARA RE-VINCULAR O PERFIL AO ID ATUAL SEM APAGAR NADA
DO $$
DECLARE
    current_id UUID;
BEGIN
    -- Busca o ID correto que você está usando agora (baseado no login do Auth)
    SELECT id INTO current_id FROM auth.users WHERE email = 'jotajoao29@gmail.com';
    
    IF current_id IS NOT NULL THEN
        -- 2.1 Se existe um perfil com esse email mas ID DIFERENTE, liberamos o e-mail renomeando o antigo
        -- (Isso evita apagar o registro e perder as revisões vinculadas a ele)
        UPDATE public.profiles 
        SET email = email || '_old_' || id::text 
        WHERE email = 'jotajoao29@gmail.com' AND id <> current_id;
        
        -- 2.2 Agora garantimos que o perfil com o seu ID ATUAL tenha o e-mail e seja ADMINISTRADOR
        INSERT INTO public.profiles (id, user_id, email, role, name, xp, level)
        VALUES (current_id, current_id, 'jotajoao29@gmail.com', 'admin', 'João Vilela', 0, 1)
        ON CONFLICT (id) DO UPDATE SET 
            email = 'jotajoao29@gmail.com', 
            role = 'admin';
            
        -- 2.3 Também garantimos na Whitelist
        INSERT INTO public.admin_whitelist (email, role)
        VALUES ('jotajoao29@gmail.com', 'admin')
        ON CONFLICT (email) DO UPDATE SET role = 'admin';
    END IF;
END $$;

-- 3. VERIFICAÇÃO FINAL
SELECT id, email, role, name FROM public.profiles WHERE email = 'jotajoao29@gmail.com';
