import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MedicalArea } from '@/lib/types';

export interface FlashcardFolder {
  id: string;
  area: MedicalArea;
  name: string;
  createdAt: string;
}

export function useFlashcardFolders(userId: string | undefined) {
  const [folders, setFolders] = useState<FlashcardFolder[]>([]);
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

    const fetchFolders = async () => {
      const { data, error } = await supabase
        .from('flashcard_folders')
        .select('*')
        .eq('user_id', userId)
        .order('area', { ascending: true })
        .order('name', { ascending: true });

      if (!isMountedRef.current) return;

      if (error) {
        console.error('Error fetching folders:', error);
      } else {
        const mapped = data.map(f => ({
          id: f.id,
          area: f.area as MedicalArea,
          name: f.name,
          createdAt: f.created_at
        }));
        setFolders(mapped);
      }
      setLoading(false);
    };

    fetchFolders();
  }, [userId]);

  const addFolder = async (folder: { area: MedicalArea; name: string }) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('flashcard_folders')
      .insert({
        user_id: userId,
        area: folder.area,
        name: folder.name
      })
      .select()
      .single();

    if (!isMountedRef.current) return null;

    if (error) {
      console.error('Error adding folder:', error);
      return null;
    }

    const newFolder: FlashcardFolder = {
      id: data.id,
      area: data.area as MedicalArea,
      name: data.name,
      createdAt: data.created_at
    };

    setFolders(prev => [...prev, newFolder]);
    return newFolder;
  };

  const updateFolder = async (id: string, updates: { name?: string }) => {
    if (!userId) return;

    const { error } = await supabase
      .from('flashcard_folders')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId);

    if (!isMountedRef.current) return;

    if (error) {
      console.error('Error updating folder:', error);
    } else {
      setFolders(prev => prev.map(f => 
        f.id === id ? { ...f, ...updates } : f
      ));
    }
  };

  const deleteFolder = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('flashcard_folders')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (!isMountedRef.current) return;

    if (error) {
      console.error('Error deleting folder:', error);
    } else {
      setFolders(prev => prev.filter(f => f.id !== id));
    }
  };

  return { folders, loading, addFolder, updateFolder, deleteFolder };
}
