import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExerciseLog } from '@/lib/types';

export function useExercises(userId: string | undefined) {
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExercises = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching exercises:', error);
    } else {
      const mapped = data.map(e => ({
        id: e.id,
        date: e.date,
        area: e.specialty as any,
        topic: e.topic,
        totalQuestions: e.total_questions,
        correctAnswers: e.correct_answers,
        classId: e.class_id,
        blockName: e.block_name
      }));
      setExercises(mapped);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const addExercise = async (exercise: Omit<ExerciseLog, 'id'>) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('exercises')
      .insert({
        user_id: userId,
        date: exercise.date,
        specialty: exercise.area,
        topic: exercise.topic,
        total_questions: exercise.totalQuestions,
        correct_answers: exercise.correctAnswers,
        class_id: exercise.classId,
        block_name: exercise.blockName
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding exercise:', error);
    } else {
      setExercises(prev => [...prev, {
        id: data.id,
        date: data.date,
        area: data.specialty as any,
        topic: data.topic,
        totalQuestions: data.total_questions,
        correctAnswers: data.correct_answers,
        classId: data.class_id,
        blockName: data.block_name
      }]);
    }
  };

  const updateExercise = async (id: string, updates: Partial<ExerciseLog>) => {
    if (!userId) return;

    const dbUpdates: any = {};
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.area) dbUpdates.specialty = updates.area;
    if (updates.topic) dbUpdates.topic = updates.topic;
    if (updates.totalQuestions !== undefined) dbUpdates.total_questions = updates.totalQuestions;
    if (updates.correctAnswers !== undefined) dbUpdates.correct_answers = updates.correctAnswers;
    if (updates.classId !== undefined) dbUpdates.class_id = updates.classId;
    if (updates.blockName !== undefined) dbUpdates.block_name = updates.blockName;

    const { error } = await supabase
      .from('exercises')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating exercise:', error);
    } else {
      setExercises(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    }
  };

  const deleteExercise = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting exercise:', error);
    } else {
      setExercises(prev => prev.filter(e => e.id !== id));
    }
  };

  return { exercises, loading, addExercise, updateExercise, deleteExercise, setExercises, refetch: fetchExercises };
}
