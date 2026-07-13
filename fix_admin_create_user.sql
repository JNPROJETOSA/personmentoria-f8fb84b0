-- =====================================================
-- CORREÇÃO DA FUNÇÃO admin_create_user
-- =====================================================
-- Suporta roles: 'admin', 'student', 'mentor'
-- Bypassa confirmação de e-mail para criação via Admin
-- =====================================================

CREATE OR REPLACE FUNCTION admin_create_user(
    new_email TEXT,
    new_password TEXT,
    new_role TEXT,
    new_name TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    executing_user_role TEXT;
    target_user_id UUID;
    encrypted_pw TEXT;
    is_new_user BOOLEAN := FALSE;
BEGIN
    -- 1. Verificar se o usuário que está executando é admin
    SELECT role INTO executing_user_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF executing_user_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can create users. Your role: %', COALESCE(executing_user_role, 'NOT FOUND');
    END IF;

    -- 2. Garantir que o email esteja na whitelist
    INSERT INTO public.admin_whitelist (email, role, created_by)
    VALUES (new_email, new_role, auth.uid())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

    -- 3. Verificar se o usuário já existe no auth.users
    SELECT id INTO target_user_id FROM auth.users WHERE email = new_email;

    IF target_user_id IS NULL THEN
        -- Criar novo usuário
        is_new_user := TRUE;
        encrypted_pw := extensions.crypt(new_password, extensions.gen_salt('bf'));
        target_user_id := gen_random_uuid();

        -- Inserir em auth.users (Dados mínimos necessários para o Supabase Auth)
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            created_at,
            updated_at,
            confirmation_token,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            target_user_id,
            'authenticated',
            'authenticated',
            new_email,
            encrypted_pw,
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            json_build_object('name', new_name, 'full_name', new_name),
            FALSE,
            NOW(),
            NOW(),
            '',
            ''
        );

        -- Inserir em auth.identities
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            target_user_id,
            json_build_object('sub', target_user_id::text, 'email', new_email),
            'email',
            target_user_id::text,
            NULL,
            NOW(),
            NOW()
        );

    ELSE
        -- Atualizar senha de usuário existente se fornecida
        IF new_password IS NOT NULL AND new_password <> '' THEN
            encrypted_pw := extensions.crypt(new_password, extensions.gen_salt('bf'));
            UPDATE auth.users
            SET encrypted_password = encrypted_pw,
                email_confirmed_at = NOW(),
                updated_at = NOW()
            WHERE id = target_user_id;
        END IF;
    END IF;

    -- 4. Garantir que o profile tenha o role correto (INCLUINDO EMAIL)
    INSERT INTO public.profiles (id, user_id, email, name, role, xp, level, streak)
    VALUES (
        target_user_id, 
        target_user_id, 
        new_email,
        COALESCE(NULLIF(new_name, ''), SPLIT_PART(new_email, '@', 1)), 
        new_role, 
        0, 1, 0
    )
    ON CONFLICT (id) DO UPDATE
        SET role = EXCLUDED.role,
            email = EXCLUDED.email,
            name = CASE
                WHEN EXCLUDED.name <> '' AND (profiles.name IS NULL OR profiles.name = 'Estudante' OR profiles.name = '') THEN EXCLUDED.name
                ELSE profiles.name
            END;

    RETURN json_build_object(
        'id', target_user_id,
        'email', new_email,
        'role', new_role,
        'status', CASE WHEN is_new_user THEN 'created' ELSE 'existing_updated' END
    );
END;
$$;

-- Permissão para admin autenticado
GRANT EXECUTE ON FUNCTION admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
