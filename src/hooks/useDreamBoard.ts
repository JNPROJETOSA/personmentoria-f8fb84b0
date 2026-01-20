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
        .in('type', ['image', 'note'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dream board items:', error);
      } else {
        setItems(data.map(item => {
          let parsedContent = item.content;
          let parsedMetadata: any = {};

          try {
            // Try to parse content as JSON for rich notes
            const parsed = JSON.parse(item.content);
            if (typeof parsed === 'object' && parsed !== null && parsed.content) {
              parsedContent = parsed.content;
              parsedMetadata = parsed;
            }
          } catch (e) {
            // If not JSON, use raw content (legacy behavior)
          }

          return {
            id: item.id,
            type: item.type as 'image' | 'note',
            content: parsedContent,
            title: parsedMetadata.title,
            color: parsedMetadata.color,
            fontColor: parsedMetadata.fontColor,
            fontSize: parsedMetadata.fontSize,
            isAutoFit: parsedMetadata.isAutoFit,
            createdAt: item.created_at || new Date().toISOString()
          };
        }));
      }
      setLoading(false);
    };

    fetchItems();
  }, [userId]);

  const addItem = async (item: Omit<DreamBoardItem, 'id'>) => {
    if (!userId) return;

    // For notes, we serialize the metadata into the content field
    // since the table doesn't have dedicated columns for styling
    let contentToSave = item.content;

    if (item.type === 'note' || item.type === 'image') {
      const richContent = {
        content: item.content,
        title: item.title,
        color: item.color,
        fontColor: item.fontColor,
        fontSize: item.fontSize,
        isAutoFit: item.isAutoFit
      };
      contentToSave = JSON.stringify(richContent);
    }

    const { data, error } = await supabase
      .from('dream_board_items')
      .insert({
        user_id: userId,
        type: item.type,
        content: contentToSave
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding dream board item:', error);
    } else {
      // Re-construct the item for the local state
      setItems(prev => [{
        id: data.id,
        type: data.type as 'image' | 'note',
        content: item.content, // Use original content for display
        title: item.title,
        color: item.color,
        fontColor: item.fontColor,
        fontSize: item.fontSize,
        isAutoFit: item.isAutoFit,
        createdAt: data.created_at || new Date().toISOString()
      }, ...prev]);
    }
  };

  const deleteItem = async (id: string) => {
    if (!userId) return false;

    // Find the item to be deleted
    const itemToDelete = items.find(i => i.id === id);

    // If it's an image stored in our bucket, delete it from storage first
    if (itemToDelete && itemToDelete.type === 'image' && itemToDelete.content && !itemToDelete.content.startsWith('http')) {
      const { error: storageError } = await supabase.storage
        .from('dream-board-images')
        .remove([itemToDelete.content]);

      if (storageError) {
        console.error('Error deleting image file:', storageError);
        // We continue to delete the record even if storage delete failed, 
        // or we could block. Usually better to clean up the record at least.
      }
    }

    const { error } = await supabase
      .from('dream_board_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting dream board item:', error);
      return false;
    } else {
      setItems(prev => prev.filter(item => item.id !== id));
      return true;
    }
  };

  return { items, loading, addItem, deleteItem };
}
