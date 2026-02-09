-- ============================================
-- RESET USER RECORDS FUNCTION - VERSÃO SIMPLIFICADA PARA TESTE
-- ============================================

-- PRIMEIRO: Drop da função antiga se existir
DROP FUNCTION IF EXISTS public.reset_user_records(UUID);

-- SEGUNDO: Criar a função nova
CREATE OR REPLACE FUNCTION public.reset_user_records(target_user_id UUID)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Deletar dados apenas do usuário específico
  DELETE FROM public.classes WHERE user_id = target_user_id;
  DELETE FROM public.exercises WHERE user_id = target_user_id;
  DELETE FROM public.exams WHERE user_id = target_user_id;
  DELETE FROM public.reviews WHERE user_id = target_user_id;
  DELETE FROM public.flashcards WHERE user_id = target_user_id;
  DELETE FROM public.dream_board_items WHERE user_id = target_user_id;
  DELETE FROM public.notebook_entries WHERE user_id = target_user_id;
  DELETE FROM public.exam_sessions WHERE user_id = target_user_id;
  DELETE FROM public.burnout_checkins WHERE user_id = target_user_id;
  
  -- Resetar campos do perfil
  UPDATE public.profiles 
  SET xp = 0, level = 1, streak = 0, last_study_date = NULL
  WHERE user_id = target_user_id;
  
  RETURN json_build_object('success', true, 'message', 'Records reset successfully', 'user_id', target_user_id);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

-- TERCEIRO: Grant permissions
GRANT EXECUTE ON FUNCTION public.reset_user_records(UUID) TO authenticated;

-- QUARTO: Comentário
COMMENT ON FUNCTION public.reset_user_records(UUID) IS 
'Resets all study records for a specific user. ONLY affects the user_id provided.';
