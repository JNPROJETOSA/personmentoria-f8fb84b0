-- Remove a política que permite visualização pública de códigos de convite
-- Isso previne que invasores coletem todos os códigos ativos
DROP POLICY IF EXISTS "Anyone can view active invite codes" ON public.invite_codes;

-- A validação de códigos deve ser feita exclusivamente através da função
-- validate_invite_code que já existe e é security definer
-- Não é necessário SELECT público para funcionar corretamente