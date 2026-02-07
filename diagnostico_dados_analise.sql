-- ============================================
-- DIAGNÓSTICO DE DADOS - ABA DE ANÁLISES
-- ============================================
-- Este script verifica se existem dados nas tabelas
-- e identifica possíveis problemas

-- 1. VERIFICAR TOTAL DE REGISTROS POR TABELA
-- ============================================
SELECT 'exercises' as tabela, COUNT(*) as total_registros FROM exercises
UNION ALL
SELECT 'exams', COUNT(*) FROM exams
UNION ALL
SELECT 'classes', COUNT(*) FROM classes
UNION ALL
SELECT 'flashcards', COUNT(*) FROM flashcards
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews
UNION ALL
SELECT 'editorial_progress', COUNT(*) FROM editorial_progress;

-- 2. VERIFICAR REGISTROS POR USUÁRIO (EXERCISES)
-- ============================================
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    COUNT(e.id) as total_exercises,
    SUM(e.total_questions) as total_questions,
    SUM(e.correct_answers) as total_correct,
    MIN(e.date) as primeira_atividade,
    MAX(e.date) as ultima_atividade
FROM profiles p
LEFT JOIN exercises e ON e.user_id = p.id
GROUP BY p.id, p.email, p.full_name
ORDER BY total_exercises DESC;

-- 3. VERIFICAR REGISTROS DOS ÚLTIMOS 3 MESES (PERÍODO PADRÃO)
-- ============================================
SELECT 
    'exercises' as tabela,
    COUNT(*) as registros_ultimos_3_meses
FROM exercises
WHERE date >= NOW() - INTERVAL '3 months'
UNION ALL
SELECT 'exams', COUNT(*) FROM exams WHERE date >= NOW() - INTERVAL '3 months'
UNION ALL
SELECT 'classes', COUNT(*) FROM classes WHERE date >= NOW() - INTERVAL '3 months'
UNION ALL
SELECT 'flashcards', COUNT(*) FROM flashcards WHERE created_at >= NOW() - INTERVAL '3 months'
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews WHERE created_at >= NOW() - INTERVAL '3 months';

-- 4. VERIFICAR POLÍTICAS RLS ATIVAS
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('exercises', 'exams', 'classes', 'flashcards', 'reviews', 'editorial_progress')
ORDER BY tablename, policyname;

-- 5. VERIFICAR SE ADMIN/MENTOR PODEM VER DADOS DE ALUNOS
-- ============================================
-- (Execute isso logado como admin ou mentor)
SELECT COUNT(*) as total_visible_exercises FROM exercises;
SELECT COUNT(*) as total_visible_exams FROM exams;
SELECT COUNT(*) as total_visible_classes FROM classes;

-- 6. EXEMPLO DE DADOS DETALHADOS (EXERCISES)
-- ============================================
SELECT 
    p.email as aluno_email,
    p.full_name as aluno_nome,
    e.date,
    e.specialty as area,
    e.topic as tema,
    e.total_questions as questoes,
    e.correct_answers as acertos,
    ROUND((e.correct_answers::numeric / NULLIF(e.total_questions, 0) * 100), 1) as taxa_acerto
FROM exercises e
JOIN profiles p ON p.id = e.user_id
ORDER BY e.date DESC
LIMIT 50;
