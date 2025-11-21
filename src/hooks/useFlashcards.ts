import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flashcard } from '@/lib/types';

export function useFlashcards(userId: string | undefined) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchFlashcards = async () => {
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching flashcards:', error);
      } else {
        const mapped = data.map(f => ({
          id: f.id,
          area: f.area,
          front: f.front,
          back: f.back,
          difficulty: null,
          lastReviewed: null,
          nextReview: null,
          reviewCount: 0
        }));
        setFlashcards(mapped);
      }
      setLoading(false);
    };

    fetchFlashcards();
  }, [userId]);

  const addFlashcard = async (flashcard: Omit<Flashcard, 'id' | 'difficulty' | 'lastReviewed' | 'nextReview' | 'reviewCount'>) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        user_id: userId,
        area: flashcard.area,
        front: flashcard.front,
        back: flashcard.back
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding flashcard:', error);
    } else {
      setFlashcards(prev => [...prev, {
        id: data.id,
        area: data.area,
        front: data.front,
        back: data.back,
        difficulty: null,
        lastReviewed: null,
        nextReview: null,
        reviewCount: 0
      }]);
    }
  };

  const deleteFlashcard = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting flashcard:', error);
    } else {
      setFlashcards(prev => prev.filter(f => f.id !== id));
    }
  };

  return { flashcards, loading, addFlashcard, deleteFlashcard, setFlashcards };
}
