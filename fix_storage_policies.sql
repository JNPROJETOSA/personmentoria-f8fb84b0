-- =====================================================
-- CORRIGIR Políticas de Storage para o bucket pdfs
-- =====================================================
-- Execute este script para adicionar as políticas corretas
-- =====================================================

-- 1. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Public PDF Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin PDF Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin PDF Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin PDF Delete" ON storage.objects;

-- 2. Criar políticas corretas

-- Permitir que todos vejam os PDFs
CREATE POLICY "Public PDF Access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs');

-- Permitir que admins façam upload
CREATE POLICY "Admin PDF Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdfs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Permitir que admins atualizem
CREATE POLICY "Admin PDF Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pdfs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Permitir que admins deletem
CREATE POLICY "Admin PDF Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pdfs' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Verificar se as políticas foram criadas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;
