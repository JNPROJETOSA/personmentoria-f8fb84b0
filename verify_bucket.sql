-- =====================================================
-- Verificar se o bucket 'pdfs' existe
-- =====================================================
-- Execute este script para verificar a situação do bucket
-- =====================================================

-- Verificar buckets existentes
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
ORDER BY created_at DESC;

-- Se não aparecer 'pdfs' na lista acima, tente este comando alternativo:
-- (Descomente as linhas abaixo removendo os --)

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('pdfs', 'pdfs', false);

-- Depois execute novamente o SELECT acima para confirmar
