-- ====================================================================
-- 🛑 SCRIPT FINAL DE REPARO: RECURSÃO DE RLS E COMPATIBILIDADE AUTH
-- ====================================================================
-- Este script corrige o erro crítico "Database error querying schema" ao login:
-- 1. Resolve a recursividade infinita nas Políticas de Segurança (RLS) do Perfil.
-- 2. Garante que novos usuários criados via SQL tenham todos os campos obrigatórios 
--    que o servidor de Autenticação do Supabase (GoTrue) espera.
-- ====================================================================

-- 1. FUNÇÃO AUXILIAR DE SEGURANÇA (Para evitar recursão no RLS)
CREATE OR REPLACE FUNCTION public.check_is_admin() 
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 2. ATUALIZAR POLÍTICAS DE RLS NA TABELA PROFILES
-- Remove políticas recursivas e instala as seguras
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING ( check_is_admin() );

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING ( check_is_admin() );


-- 3. ATUALIZAR RESTRIÇÕES DE CARGO (ROLE)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'student', 'mentor'));

ALTER TABLE public.admin_whitelist DROP CONSTRAINT IF EXISTS admin_whitelist_role_check;
ALTER TABLE public.admin_whitelist ADD CONSTRAINT admin_whitelist_role_check CHECK (role IN ('admin', 'student', 'mentor'));


-- 4. CORREÇÃO DA FUNÇÃO DE TRIGGER (Cadastro Automático)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  whitelist_role TEXT;
BEGIN
  SELECT role INTO whitelist_role FROM public.admin_whitelist WHERE email = new.email;

  IF whitelist_role IS NOT NULL THEN
    INSERT INTO public.profiles (id, user_id, email, role, name, full_name, xp, level, streak)
    VALUES (
        new.id, 
        new.id, 
        new.email, 
        whitelist_role, 
        COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', SPLIT_PART(new.email, '@', 1)),
        0, 1, 0
    )
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        name = CASE WHEN profiles.name IS NULL OR profiles.name = '' THEN EXCLUDED.name ELSE profiles.name END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;


-- 5. FUNÇÃO RPC ROBUSTA (Criação via Painel Admin)
-- Esta versão preenche TODOS os campos que o Supabase exige para evitar erro no login 500.
CREATE OR REPLACE FUNCTION public.admin_create_user(
    new_email TEXT,
    new_password TEXT,
    new_role TEXT,
    new_name TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    target_user_id UUID;
    encrypted_pw TEXT;
    is_new_user BOOLEAN := FALSE;
BEGIN
    -- Verificar se quem chama é admin
    IF NOT public.check_is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar novos usuários.';
    END IF;

    -- Whitelist
    INSERT INTO public.admin_whitelist (email, role, created_by)
    VALUES (new_email, new_role, auth.uid())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

    -- Buscar id se existir
    SELECT id INTO target_user_id FROM auth.users WHERE email = new_email;

    IF target_user_id IS NULL THEN
        is_new_user := TRUE;
        target_user_id := gen_random_uuid();
        encrypted_pw := extensions.crypt(new_password, extensions.gen_salt('bf'));

        -- INSERÇÃO COMPLETA NO AUTH.USERS (Para evitar erro de schema no login)
        INSERT INTO auth.users (
            instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
            invited_at, confirmation_token, confirmation_sent_at, recovery_token, 
            recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, 
            last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, 
            created_at, updated_at, phone, phone_confirmed_at, phone_change, 
            phone_change_token, phone_change_sent_at, email_change_token_current, 
            email_change_confirm_status, banned_until, reauthentication_token, 
            reauthentication_sent_at, is_sso_user, deleted_at
        ) VALUES (
            '00000000-0000-0000-0000-000000000000', target_user_id, 'authenticated', 'authenticated', 
            new_email, encrypted_pw, NOW(), 
            NULL, '', NULL, '', 
            NULL, '', '', NULL, 
            NULL, '{"provider": "email", "providers": ["email"]}', 
            json_build_object('name', new_name, 'full_name', new_name), FALSE, 
            NOW(), NOW(), NULL, NULL, '', 
            '', NULL, '', 
            0, NULL, '', 
            NULL, FALSE, NULL
        );

        -- Identidades
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), target_user_id, json_build_object('sub', target_user_id::text, 'email', new_email), 
            'email', target_user_id::text, NULL, NOW(), NOW()
        );
    ELSE
        IF new_password <> '' THEN
            UPDATE auth.users SET 
                encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')), 
                updated_at = NOW(),
                email_confirmed_at = COALESCE(email_confirmed_at, NOW()) -- Garante confirmação se estava pendente
            WHERE id = target_user_id;
        END IF;
    END IF;

    -- Sincronizar Perfil
    INSERT INTO public.profiles (id, user_id, email, name, role, xp, level, streak)
    VALUES (
        target_user_id, target_user_id, new_email, 
        COALESCE(NULLIF(new_name, ''), SPLIT_PART(new_email, '@', 1)), 
        new_role, 0, 1, 0
    )
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role, 
        email = EXCLUDED.email,
        name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE profiles.name END;

    RETURN json_build_object('id', target_user_id, 'status', CASE WHEN is_new_user THEN 'created' ELSE 'updated' END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
