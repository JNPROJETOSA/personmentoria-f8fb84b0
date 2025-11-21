import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DreamBoardItem } from '@/lib/types';

export function useDreamBoard(userId: string | undefined) {
  const [items, setItems] = useState<DreamBoardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('dream_board_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dream board items:', error);
      } else {
        setItems(data.map(item => ({
          id: item.id,
          type: item.type as 'image' | 'note',
          content: item.content,
          createdAt: item.created_at || new Date().toISOString()
        })));
      }
      setLoading(false);
    };

    fetchItems();
  }, [userId]);

  const addItem = async (item: Omit<DreamBoardItem, 'id'>) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('dream_board_items')
      .insert({
        user_id: userId,
        type: item.type,
        content: item.content
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding dream board item:', error);
    } else {
      setItems(prev => [...prev, {
        id: data.id,
        type: data.type as 'image' | 'note',
        content: data.content,
        createdAt: data.created_at || new Date().toISOString()
      }]);
    }
  };

  const deleteItem = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('dream_board_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting dream board item:', error);
    } else {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  return { items, loading, addItem, deleteItem };
}
