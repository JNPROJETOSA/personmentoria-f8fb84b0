-- ============================================
-- CORREÇÃO DE POLÍTICAS RLS - ABA DE ANÁLISES
-- ============================================
-- Este script garante que admins e mentores possam ver dados de todos os alunos

-- 1. CRIAR POLÍTICA PARA ADMIN/MENTOR VER EXERCISES DE TODOS
-- ============================================
-- Primeiro, remover política antiga se existir
DROP POLICY IF EXISTS "Admins and mentors can view all exercises" ON exercises;

-- Criar nova política que permite admin e mentor ver tudo
CREATE POLICY "Admins and mentors can view all exercises" ON exercises
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'mentor')
        )
    );

-- 2. CRIAR POLÍTICA PARA ADMIN/MENTOR VER EXAMS DE TODOS
-- ============================================
DROP POLICY IF EXISTS "Admins and mentors can view all exams" ON exams;

CREATE POLICY "Admins and mentors can view all exams" ON exams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'mentor')
        )
    );

-- 3. CRIAR POLÍTICA PARA ADMIN/MENTOR VER CLASSES DE TODOS
-- ============================================
DROP POLICY IF EXISTS "Admins and mentors can view all classes" ON classes;

CREATE POLICY "Admins and mentors can view all classes" ON classes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'mentor')
        )
    );

-- 4. CRIAR POLÍTICA PARA ADMIN/MENTOR VER FLASHCARDS DE TODOS
-- ============================================
DROP POLICY IF EXISTS "Admins and mentors can view all flashcards" ON flashcards;

CREATE POLICY "Admins and mentors can view all flashcards" ON flashcards
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'mentor')
        )
    );

-- 5. CRIAR POLÍTICA PARA ADMIN/MENTOR VER REVIEWS DE TODOS
-- ============================================
DROP POLICY IF EXISTS "Admins and mentors can view all reviews" ON reviews;

CREATE POLICY "Admins and mentors can view all reviews" ON reviews
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'mentor')
        )
    );

-- 6. CRIAR POLÍTICA PARA ADMIN/MENTOR VER EDITORIAL_PROGRESS DE TODOS
-- ============================================
DROP POLICY IF EXISTS "Admins and mentors can view all editorial_progress" ON editorial_progress;

CREATE POLICY "Admins and mentors can view all editorial_progress" ON editorial_progress
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'mentor')
        )
    );

-- 7. CRIAR POLÍTICA PARA ADMIN/MENTOR VER BURNOUT_CHECKINS DE TODOS
-- ============================================
DROP POLICY IF EXISTS "Admins and mentors can view all burnout_checkins" ON burnout_checkins;

CREATE POLICY "Admins and mentors can view all burnout_checkins" ON burnout_checkins
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'mentor')
        )
    );

-- VERIFICAÇÃO: Listar todas as políticas criadas
SELECT 
    tablename,
    policyname,
    cmd as comando,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('exercises', 'exams', 'classes', 'flashcards', 'reviews', 'editorial_progress', 'burnout_checkins')
AND policyname LIKE '%Admins and mentors%'
ORDER BY tablename;
