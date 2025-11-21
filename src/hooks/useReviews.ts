import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ManualReviewLog } from '@/lib/types';

export function useReviews(userId: string | undefined) {
  const [reviews, setReviews] = useState<ManualReviewLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
      } else {
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

  const addReview = async (topic: string) => {
    if (!userId) return;

    const date = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: userId,
        topic: topic,
        date: date,
        priority: 2,
        completed: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding review:', error);
    } else {
      setReviews(prev => [...prev, {
        id: data.id,
        topic: data.topic,
        date: data.date
      }]);
    }
  };

  return { reviews, loading, addReview };
}
