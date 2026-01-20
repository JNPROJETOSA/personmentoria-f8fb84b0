-- ADICIONA JOÃO A LISTA VIP (ADMIN)
INSERT INTO public.admin_whitelist (email, role)
VALUES ('jotajoao29@gmail.com', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- CORREÇÃO DE PERFIL PERDIDO
-- Se o usuário já criou a conta no Auth mas o trigger falhou, isso cria o perfil manualmente
INSERT INTO public.profiles (id, user_id, email, role, name, full_name, level, xp)
SELECT 
  id, id, email, 'admin', 'João Vilela', 'João Vilela', 1, 0
FROM auth.users 
WHERE email = 'jotajoao29@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Confirmação
SELECT * FROM public.admin_whitelist WHERE email = 'jotajoao29@gmail.com';
