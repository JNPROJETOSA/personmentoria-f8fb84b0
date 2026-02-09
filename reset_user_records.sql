-- ============================================
-- RESET USER RECORDS FUNCTION (VERSÃO CORRIGIDA)
-- ============================================
-- This function allows a user to reset ALL their study records
-- It will DELETE all data from study-related tables and reset progress fields
-- IMPORTANT: This action is IRREVERSIBLE!
-- SECURITY: Only deletes records for the specified user_id
-- ============================================

CREATE OR REPLACE FUNCTION public.reset_user_records(target_user_id UUID)
RETURNS JSON AS $$
BEGIN
  -- Verify that the user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Delete all user study records
  -- Each DELETE only affects records WHERE user_id = target_user_id
  -- Only deletes from tables that exist
  
  -- 1. Classes (aulas)
  DELETE FROM public.classes WHERE user_id = target_user_id;
  
  -- 2. Exercises (registros de exercícios) - nome correto: exercises
  DELETE FROM public.exercises WHERE user_id = target_user_id;
  
  -- 3. Exams (simulados) - nome correto: exams
  DELETE FROM public.exams WHERE user_id = target_user_id;
  
  -- 4. Reviews (revisões)
  DELETE FROM public.reviews WHERE user_id = target_user_id;
  
  -- 5. Flashcard folders (will cascade delete flashcards)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flashcard_folders') THEN
    DELETE FROM public.flashcard_folders WHERE user_id = target_user_id;
  END IF;
  
  -- 6. Flashcards
  DELETE FROM public.flashcards WHERE user_id = target_user_id;
  
  -- 7. Flashcard reviews
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flashcard_reviews') THEN
    DELETE FROM public.flashcard_reviews WHERE user_id = target_user_id;
  END IF;
  
  -- 8. Flashcard study sessions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'flashcard_study_sessions') THEN
    DELETE FROM public.flashcard_study_sessions WHERE user_id = target_user_id;
  END IF;
  
  -- 9. Dream board items - nome correto: dream_board_items
  DELETE FROM public.dream_board_items WHERE user_id = target_user_id;
  
  -- 10. Notebook folders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notebook_folders') THEN
    DELETE FROM public.notebook_folders WHERE user_id = target_user_id;
  END IF;
  
  -- 11. Notebook entries
  DELETE FROM public.notebook_entries WHERE user_id = target_user_id;
  
  -- 12. Notebooks (old structure)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notebooks') THEN
    DELETE FROM public.notebooks WHERE user_id = target_user_id;
  END IF;
  
  -- 13. Exam sessions (modo prova)
  DELETE FROM public.exam_sessions WHERE user_id = target_user_id;
  
  -- 14. Burnout check-ins
  DELETE FROM public.burnout_checkins WHERE user_id = target_user_id;
  
  -- 15. Editorials
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'editorials') THEN
    DELETE FROM public.editorials WHERE user_id = target_user_id;
  END IF;
  
  -- 16. Editorial progress
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'editorial_progress') THEN
    DELETE FROM public.editorial_progress WHERE user_id = target_user_id;
  END IF;
  
  -- 17. Mind map areas (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mind_map_areas') THEN
    DELETE FROM public.mind_map_areas WHERE user_id = target_user_id;
  END IF;
  
  -- 18. Mind map folders (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mind_map_folders') THEN
    DELETE FROM public.mind_map_folders WHERE user_id = target_user_id;
  END IF;
  
  -- 19. Mind maps (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mind_maps') THEN
    DELETE FROM public.mind_maps WHERE user_id = target_user_id;
  END IF;
  
  -- 20. Study strategies (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'study_strategies') THEN
    DELETE FROM public.study_strategies WHERE user_id = target_user_id;
  END IF;
  
  -- Reset profile progress fields to default values (ONLY for this user)
  UPDATE public.profiles 
  SET 
    xp = 0, 
    level = 1, 
    streak = 0, 
    last_study_date = NULL
  WHERE user_id = target_user_id;
  
  -- Note: We do NOT reset goals, as those are user preferences
  -- Note: We do NOT delete profile data (name, email, etc.)
  
  RETURN json_build_object(
    'success', true, 
    'message', 'All user records have been successfully reset',
    'user_id', target_user_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return error details
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reset_user_records(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.reset_user_records(UUID) IS 
'Resets all study records for a SPECIFIC user only. This includes classes, exercises, exams, reviews, flashcards, notebooks, and all progress. This action is irreversible. Profile data (name, email, etc.) and goals are preserved. IMPORTANT: Only affects the user_id provided as parameter.';

