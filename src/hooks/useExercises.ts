import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExerciseLog } from '@/lib/types';

export function useExercises(userId: string | undefined) {
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchExercises = async () => {
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
          correctAnswers: e.correct_answers
        }));
        setExercises(mapped);
      }
      setLoading(false);
    };

    fetchExercises();
  }, [userId]);

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
        correct_answers: exercise.correctAnswers
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
        correctAnswers: data.correct_answers
      }]);
    }
  };

  const updateExercise = async (id: string, updates: Partial<ExerciseLog>) => {
    if (!userId) return;

    const dbUpdates: any = {};
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.area) dbUpdates.specialty = updates.area;
    if (updates.topic) dbUpdates.topic = updates.topic;
    if (updates.totalQuestions) dbUpdates.total_questions = updates.totalQuestions;
    if (updates.correctAnswers) dbUpdates.correct_answers = updates.correctAnswers;

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

  return { exercises, loading, addExercise, updateExercise, deleteExercise, setExercises };
}
