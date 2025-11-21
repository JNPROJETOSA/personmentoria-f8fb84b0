-- Criar tabela para goals (metas semanais)
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weekly_questions INTEGER NOT NULL DEFAULT 50,
  target_accuracy INTEGER NOT NULL DEFAULT 80,
  target_topics_per_week INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela para user_progress (gamificação)
-- Esta tabela já existe parcialmente como profiles, vamos adicionar os campos que faltam
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_activities INTEGER DEFAULT 0;

-- Tabela dream_board_items já existe, perfeito!

-- Criar tabela para editorial_data (Edital Verticalizado)
CREATE TABLE public.editorial_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  area TEXT NOT NULL,
  sub_area TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not-started',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, area, sub_area, topic)
);

ALTER TABLE public.editorial_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own editorial progress"
  ON public.editorial_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own editorial progress"
  ON public.editorial_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own editorial progress"
  ON public.editorial_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own editorial progress"
  ON public.editorial_progress FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_editorial_progress_updated_at
  BEFORE UPDATE ON public.editorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();