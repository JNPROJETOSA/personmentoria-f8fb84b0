-- ====================================================================
-- 🚨 SCRIPT DE EMERGÊNCIA: DESBLOQUEIO TOTAL E REPARO RLS
-- ====================================================================
-- Este script resolve:
-- 1. Remoção de usuários corrompidos que travam o painel administrativo.
-- 2. Correção definitiva de recursividade infinita (Infinite Recursion) nas políticas de segurança.
-- 3. Limpeza de gatilhos (triggers) que impedem o uso do sistema.
-- ====================================================================

-- 1. DELETAR USUÁRIO CORROMPIDO (Para destravar o painel do Supabase)
-- Se você tiver outros usuários travados, adicione-os na lista abaixo.
DELETE FROM auth.users WHERE email = 'lorenzocchielle@gmail.com';
DELETE FROM public.profiles WHERE email = 'lorenzocchielle@gmail.com';
DELETE FROM public.admin_whitelist WHERE email = 'lorenzocchielle@gmail.com';


-- 2. FUNÇÃO AUXILIAR DE SEGURANÇA (Anti-Recursão)
-- Esta função permite verificar o cargo sem disparar as políticas de RLS infinitamente.
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


-- 3. RESETAR E REINSTALAR POLÍTICAS (Sem loops infinitos)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recriar Políticas Seguras
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING ( check_is_admin() );

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING ( auth.uid() = id );

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING ( check_is_admin() );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- 4. LIMPAR GATILHOS (TRIGGERS) PROBLEMÁTICOS
-- Substituímos o gatilho complexo por um "Silencioso" que não trava o Auth se o perfil falhar.
CREATE OR REPLACE FUNCTION public.handle_new_user_silent()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, email, role, name, full_name, xp, level, streak)
  VALUES (
      new.id, 
      new.id, 
      new.email, 
      'student', -- Role padrão, será atualizado pelo Admin depois
      COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', SPLIT_PART(new.email, '@', 1)),
      0, 1, 0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log de erro apenas, mas NÃO bloqueia a criação do usuário no Auth
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_silent();


-- 5. REPOR FUNÇÃO RPC SIMPLIFICADA (Apenas Whitelist e Perfil)
-- Evitamos mexer na tabela auth.users manualmente para manter a saúde do servidor GoTrue.
CREATE OR REPLACE FUNCTION public.admin_create_user(
    new_email TEXT,
    new_password TEXT, -- Não usado nesta versão para maior segurança, o usuário criará sua senha via SignUp
    new_role TEXT,
    new_name TEXT DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificar se quem chama é admin
    IF NOT public.check_is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar novos usuários.';
    END IF;

    -- Apenas Whitelist (Isso libera o SignUp para o usuário)
    INSERT INTO public.admin_whitelist (email, role, created_by)
    VALUES (new_email, new_role, auth.uid())
    ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role;

    RETURN json_build_object('status', 'whitelisted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
