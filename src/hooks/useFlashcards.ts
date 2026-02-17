import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Flashcard } from '@/lib/types';

export function useFlashcards(userId: string | undefined) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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

      if (!isMountedRef.current) return;

      if (error) {
        console.error('Error fetching flashcards:', error);
      } else {
        const mapped = data.map(f => ({
          id: f.id,
          type: (f as any).type || 'standard',
          area: f.area as any,
          front: f.front,
          back: f.back,
          front_image_url: (f as any).front_image_url || null,
          answer_image_url: (f as any).answer_image_url || null,
          folderId: f.folder_id || null,
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
        back: flashcard.back,
        front_image_url: flashcard.front_image_url || null,
        answer_image_url: flashcard.answer_image_url || null,
        folder_id: flashcard.folderId || null,
        type: flashcard.type || 'standard'
      })
      .select()
      .single();

    if (!isMountedRef.current) return;

    if (error) {
      console.error('Error adding flashcard:', error);
    } else {
      setFlashcards(prev => [...prev, {
        id: data.id,
        type: (data as any).type || 'standard',
        area: data.area as any,
        front: data.front,
        back: data.back,
        front_image_url: (data as any).front_image_url || null,
        answer_image_url: (data as any).answer_image_url || null,
        folderId: data.folder_id || null,
        difficulty: null,
        lastReviewed: null,
        nextReview: null,
        reviewCount: 0
      }]);
    }
  };

  const deleteFlashcard = async (id: string) => {
    if (!userId) return;

    // Find the flashcard to be deleted
    const flashcardToDelete = flashcards.find(f => f.id === id);

    // Delete front image from storage if exists
    if (flashcardToDelete && flashcardToDelete.front_image_url) {
      if (!flashcardToDelete.front_image_url.startsWith('http')) {
        const { error: storageError } = await supabase.storage
          .from('flashcard-images')
          .remove([flashcardToDelete.front_image_url]);

        if (storageError) {
          console.error('Error deleting front image file:', storageError);
        }
      }
    }

    // Delete back image from storage if exists
    if (flashcardToDelete && flashcardToDelete.answer_image_url) {
      if (!flashcardToDelete.answer_image_url.startsWith('http')) {
        const { error: storageError } = await supabase.storage
          .from('flashcard-images')
          .remove([flashcardToDelete.answer_image_url]);

        if (storageError) {
          console.error('Error deleting back image file:', storageError);
        }
      }
    }

    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (!isMountedRef.current) return;

    if (error) {
      console.error('Error deleting flashcard:', error);
    } else {
      setFlashcards(prev => prev.filter(f => f.id !== id));
    }
  };

  const updateFlashcard = async (id: string, updates: { area?: string; front?: string; back?: string; front_image_url?: string | null; answer_image_url?: string | null; folderId?: string | null }) => {
    if (!userId) return;

    const dbUpdates: any = {};
    if (updates.area !== undefined) dbUpdates.area = updates.area;
    if (updates.front !== undefined) dbUpdates.front = updates.front;
    if (updates.back !== undefined) dbUpdates.back = updates.back;
    if (updates.front_image_url !== undefined) dbUpdates.front_image_url = updates.front_image_url;
    if (updates.answer_image_url !== undefined) dbUpdates.answer_image_url = updates.answer_image_url;
    if (updates.folderId !== undefined) dbUpdates.folder_id = updates.folderId;
    if ((updates as any).type !== undefined) dbUpdates.type = (updates as any).type;

    const { error } = await supabase
      .from('flashcards')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (!isMountedRef.current) return;

    if (error) {
      console.error('Error updating flashcard:', error);
    } else {
      setFlashcards(prev => prev.map(f =>
        f.id === id
          ? {
            ...f,
            area: (updates.area || f.area) as any,
            front: updates.front !== undefined ? updates.front : f.front,
            back: updates.back !== undefined ? updates.back : f.back,
            front_image_url: updates.front_image_url !== undefined ? updates.front_image_url : f.front_image_url,
            answer_image_url: updates.answer_image_url !== undefined ? updates.answer_image_url : f.answer_image_url,
            folderId: updates.folderId !== undefined ? updates.folderId : f.folderId
          }
          : f
      ));
    }
  };

  const moveFlashcardToFolder = async (flashcardId: string, folderId: string | null) => {
    await updateFlashcard(flashcardId, { folderId });
  };

  return { flashcards, loading, addFlashcard, deleteFlashcard, updateFlashcard, moveFlashcardToFolder, setFlashcards };
}
