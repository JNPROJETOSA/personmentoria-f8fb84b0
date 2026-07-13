-- Script de Criação das Tabelas para Notificação Geral

-- 1. Tabela de Notificações Gerais
CREATE TABLE IF NOT EXISTS public.general_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    active BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 2. Tabela de Confirmações de Leitura
CREATE TABLE IF NOT EXISTS public.general_notification_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES public.general_notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (notification_id, user_id, version)
);

-- 3. Habilitar RLS
ALTER TABLE public.general_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_notification_reads ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para general_notifications
CREATE POLICY "Users can view active general notifications" 
    ON public.general_notifications
    FOR SELECT 
    USING (active = true);

CREATE POLICY "Admins have full access to general notifications" 
    ON public.general_notifications
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Políticas para general_notification_reads
CREATE POLICY "Users can view their own notification reads" 
    ON public.general_notification_reads
    FOR SELECT 
    USING (user_id = auth.uid());

CREATE POLICY "Users can record their own notification reads" 
    ON public.general_notification_reads
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins have full access to notification reads" 
    ON public.general_notification_reads
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
