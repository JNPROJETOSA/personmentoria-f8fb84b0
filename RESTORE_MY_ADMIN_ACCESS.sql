-- ====================================================================
-- ⚡ RESTAURAÇÃO URGENTE DE ACESSO ADMINISTRADOR
-- ====================================================================
-- Este script garante que seu e-mail tenha permissão de Admin novamente.
-- ====================================================================

-- 1. Garante que seu email está na Whitelist como Admin
INSERT INTO public.admin_whitelist (email, role)
VALUES 
    ('jotajoao29@gmail.com', 'admin'),
    ('famulape@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- 2. Garante que seu Perfil está como Admin (Sincronizando com o Auth)
INSERT INTO public.profiles (id, user_id, email, role, name, xp, level)
SELECT 
    id, id, email, 'admin', COALESCE(raw_user_meta_data->>'full_name', 'Administrador'), 0, 1
FROM auth.users 
WHERE email IN ('jotajoao29@gmail.com', 'famulape@gmail.com')
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- 3. Atualização direta caso o perfil já exista
UPDATE public.profiles 
SET role = 'admin' 
WHERE email IN ('jotajoao29@gmail.com', 'famulape@gmail.com');

-- 4. Verificação final (Veja o resultado na aba Results abaixo)
SELECT email, role, 'Whitelist' as origem FROM public.admin_whitelist WHERE role = 'admin'
UNION ALL
SELECT email, role, 'Perfil' as origem FROM public.profiles WHERE role = 'admin';
