import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Goals } from '@/lib/types';

export function useGoals(userId: string | undefined) {
  const [goals, setGoals] = useState<Goals>({
    weeklyQuestions: 50,
    targetAccuracy: 80,
    targetTopicsPerWeek: 5
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchGoals = async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No goals found, create default
          await createDefaultGoals();
        } else {
          console.error('Error fetching goals:', error);
        }
      } else {
        setGoals({
          weeklyQuestions: data.weekly_questions,
          targetAccuracy: data.target_accuracy,
          targetTopicsPerWeek: data.target_topics_per_week
        });
      }
      setLoading(false);
    };

    const createDefaultGoals = async () => {
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          weekly_questions: 50,
          target_accuracy: 80,
          target_topics_per_week: 5
        });

      if (error) {
        console.error('Error creating default goals:', error);
      }
    };

    fetchGoals();
  }, [userId]);

  const updateGoals = async (newGoals: Goals) => {
    if (!userId) return;

    const { error } = await supabase
      .from('goals')
      .update({
        weekly_questions: newGoals.weeklyQuestions,
        target_accuracy: newGoals.targetAccuracy,
        target_topics_per_week: newGoals.targetTopicsPerWeek
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating goals:', error);
    } else {
      setGoals(newGoals);
    }
  };

  return { goals, loading, updateGoals };
}
