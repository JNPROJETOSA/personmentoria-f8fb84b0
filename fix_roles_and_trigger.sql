-- =====================================================
-- CORREÇÃO DE ROLES E TRIGGER DE AUTENTICAÇÃO
-- =====================================================
-- 1. Permite o cargo 'mentor' nas tabelas de perfil e whitelist
-- 2. Corrige a trigger de signup para evitar erros de "Database error"
-- =====================================================

-- 1. Atualizar restrições na tabela profiles
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'student', 'mentor'));

-- 2. Atualizar restrições na tabela admin_whitelist
ALTER TABLE public.admin_whitelist 
DROP CONSTRAINT IF EXISTS admin_whitelist_role_check;

ALTER TABLE public.admin_whitelist 
ADD CONSTRAINT admin_whitelist_role_check 
CHECK (role IN ('admin', 'student', 'mentor'));

-- 3. Corrigir a função da trigger com SET search_path e segurança
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  whitelist_role TEXT;
BEGIN
  -- 1. Tentar encontrar o cargo na whitelist pelo email
  SELECT role INTO whitelist_role
  FROM public.admin_whitelist
  WHERE email = new.email;

  -- 2. Se estiver na whitelist, criar o perfil
  IF whitelist_role IS NOT NULL THEN
    INSERT INTO public.profiles (id, user_id, email, role, name)
    VALUES (
        new.id, 
        new.id, 
        new.email, 
        whitelist_role, 
        COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1))
    )
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role,
        name = CASE WHEN profiles.name IS NULL OR profiles.name = '' THEN EXCLUDED.name ELSE profiles.name END;
    
    RETURN NEW;
  ELSE
    -- 3. Opcional: Bloquear signup se não estiver na whitelist
    -- Comente as linhas abaixo se quiser permitir signup público (sem role)
    RAISE EXCEPTION 'O email % não está autorizado. Entre em contato com o administrador.', new.email;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log do erro para debug (opcional no Supabase Logs)
  RAISE WARNING 'Erro ao criar perfil no signup: %', SQLERRM;
  RETURN NEW; -- Retorna NEW para não travar o Auth mesmo se o perfil falhar (opcional)
END;
$$;

-- 4. Garantir que a trigger está ativa
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
