import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ManualReviewLog } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

import { format } from 'date-fns';

export function useReviews(userId: string | undefined) {
  const [reviews, setReviews] = useState<ManualReviewLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchReviews = async () => {
      console.log('Fetching reviews...');
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
      } else {
        console.log('Reviews fetched:', data?.length);
        const mapped = data.map(r => ({
          id: r.id,
          topic: r.topic,
          date: r.date
        }));
        setReviews(mapped);
      }
      setLoading(false);
    };

    fetchReviews();
  }, [userId]);

  const addReview = async (topic: string, area: string = 'Geral', dueDate?: string) => {
    if (!userId) {
      console.error('AddReview called without user ID');
      return;
    }

    const date = format(new Date(), 'yyyy-MM-dd');
    // If no due date provided, assume it was due today (safe fallback)
    const finalDueDate = dueDate || date;

    console.log(`Adding review for ${topic} (${area}) - Due: ${finalDueDate} - Done: ${date}`);

    // Optimistic update for immediate UI feedback
    const tempId = crypto.randomUUID();
    const tempReview = { id: tempId, topic, date };
    setReviews(prev => [tempReview, ...prev]);

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: userId,
        topic: topic,
        area: area,
        due_date: finalDueDate,
        date: date
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding review:', error);
      toast({
        title: "Erro ao salvar revisão",
        description: `Ocorreu um erro: ${(error as any).message || 'Erro desconhecido'}`,
        variant: "destructive"
      });
      // Rollback on error
      setReviews(prev => prev.filter(r => r.id !== tempId));
    } else {
      console.log('Review added successfully:', data);
      // Update with real ID
      setReviews(prev => prev.map(r => r.id === tempId ? {
        id: data.id,
        topic: data.topic,
        date: data.date
      } : r));
    }
  };

  return { reviews, loading, addReview };
}
