-- =========================================================================
-- MIGRAÇÃO FSRS — Sistema de Repetição Espaçada para Flashcards
-- =========================================================================
-- REGRA: MIGRAÇÃO ADITIVA. Nenhuma tabela, coluna ou dado existente é
-- alterado ou removido. Apenas novas tabelas e políticas são criadas.
-- =========================================================================

-- 1. Tabela de estado SRS individual por card+usuário
-- Cada flashcard possui seu próprio estado de aprendizagem POR USUÁRIO.
CREATE TABLE IF NOT EXISTS public.flashcard_srs_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,

    -- Estado FSRS
    state TEXT NOT NULL DEFAULT 'new'
        CHECK (state IN ('new', 'learning', 'review', 'relearning')),

    -- Parâmetros FSRS
    difficulty DOUBLE PRECISION NOT NULL DEFAULT 0.3,   -- D ∈ [0,1]
    stability DOUBLE PRECISION NOT NULL DEFAULT 0.0,     -- S em dias
    
    -- Agendamento
    due TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), -- próxima revisão
    last_review TIMESTAMP WITH TIME ZONE,                -- última revisão

    -- Contadores
    reps INTEGER NOT NULL DEFAULT 0,                     -- revisões de sucesso
    lapses INTEGER NOT NULL DEFAULT 0,                   -- erros/lapsos

    -- Intervalos
    elapsed_days INTEGER NOT NULL DEFAULT 0,             -- dias desde última revisão
    scheduled_days INTEGER NOT NULL DEFAULT 0,           -- intervalo agendado em dias

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

    -- Constraint: um registro SRS por card por usuário
    UNIQUE (user_id, flashcard_id)
);

-- 2. Tabela de histórico de revisões (log imutável)
-- Cada interação de revisão é registrada para análise futura.
CREATE TABLE IF NOT EXISTS public.flashcard_review_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,

    -- Resposta: 1=Again, 2=Hard, 3=Good, 4=Easy
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 4),

    -- Estado antes e depois
    state_before TEXT NOT NULL,
    state_after TEXT NOT NULL,

    -- Parâmetros antes e depois
    difficulty_before DOUBLE PRECISION,
    difficulty_after DOUBLE PRECISION,
    stability_before DOUBLE PRECISION,
    stability_after DOUBLE PRECISION,
    due_before TIMESTAMP WITH TIME ZONE,
    due_after TIMESTAMP WITH TIME ZONE,

    -- Intervalos
    elapsed_days INTEGER DEFAULT 0,
    scheduled_days INTEGER DEFAULT 0,

    -- Duração opcional (quanto tempo o aluno demorou no card, em ms)
    review_duration_ms INTEGER,

    -- Timestamp imutável
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =========================================================================
-- 3. Row Level Security
-- =========================================================================

ALTER TABLE public.flashcard_srs_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_review_log ENABLE ROW LEVEL SECURITY;

-- flashcard_srs_data: SELECT
CREATE POLICY "Users can view their own SRS data"
    ON public.flashcard_srs_data FOR SELECT
    USING (auth.uid() = user_id);

-- flashcard_srs_data: INSERT
CREATE POLICY "Users can insert their own SRS data"
    ON public.flashcard_srs_data FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- flashcard_srs_data: UPDATE
CREATE POLICY "Users can update their own SRS data"
    ON public.flashcard_srs_data FOR UPDATE
    USING (auth.uid() = user_id);

-- flashcard_srs_data: DELETE
CREATE POLICY "Users can delete their own SRS data"
    ON public.flashcard_srs_data FOR DELETE
    USING (auth.uid() = user_id);

-- flashcard_review_log: SELECT
CREATE POLICY "Users can view their own review logs"
    ON public.flashcard_review_log FOR SELECT
    USING (auth.uid() = user_id);

-- flashcard_review_log: INSERT
CREATE POLICY "Users can insert their own review logs"
    ON public.flashcard_review_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- 4. Índices para performance
-- =========================================================================

-- Busca rápida de cards vencidos por usuário
CREATE INDEX IF NOT EXISTS idx_srs_data_user_due
    ON public.flashcard_srs_data (user_id, due);

-- Busca rápida de cards por estado
CREATE INDEX IF NOT EXISTS idx_srs_data_user_state
    ON public.flashcard_srs_data (user_id, state);

-- Busca rápida de logs por flashcard
CREATE INDEX IF NOT EXISTS idx_review_log_user_flashcard
    ON public.flashcard_review_log (user_id, flashcard_id, created_at DESC);

-- Busca rápida de logs por data (para métricas diárias)
CREATE INDEX IF NOT EXISTS idx_review_log_user_date
    ON public.flashcard_review_log (user_id, created_at);

-- =========================================================================
-- 5. Trigger para atualizar updated_at automaticamente
-- =========================================================================

CREATE OR REPLACE FUNCTION update_flashcard_srs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_srs_updated_at ON public.flashcard_srs_data;
CREATE TRIGGER trigger_update_srs_updated_at
    BEFORE UPDATE ON public.flashcard_srs_data
    FOR EACH ROW
    EXECUTE FUNCTION update_flashcard_srs_updated_at();

-- =========================================================================
-- FIM DA MIGRAÇÃO
-- =========================================================================
-- Para verificar após execução:
-- SELECT count(*) FROM public.flashcard_srs_data;
-- SELECT count(*) FROM public.flashcard_review_log;
-- SELECT count(*) FROM public.flashcards;  -- deve permanecer igual
-- SELECT count(*) FROM public.flashcard_folders;  -- deve permanecer igual
