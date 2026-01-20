import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MedicalArea } from '@/lib/types';

export interface NotebookEntry {
  id: string;
  user_id: string;
  specialty: MedicalArea;
  folder_id: string | null;
  name: string;
  content: string;
  created_at?: string;
  updated_at: string;
}

export function useNotebook(userId: string | undefined) {
  const [notebooks, setNotebooks] = useState<NotebookEntry[]>([]);
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

    const fetchNotebooks = async () => {
      const { data, error } = await supabase
        .from('notebook_entries')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!isMountedRef.current) return;

      if (error) {
        console.error('Error fetching notebooks:', error);
      } else {
        setNotebooks(data as NotebookEntry[]);
      }
      setLoading(false);
    };

    fetchNotebooks();
  }, [userId]);

  const addNotebook = async (
    folderId: string | null,
    name: string,
    area: MedicalArea,
    content: string = ''
  ): Promise<NotebookEntry | null> => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('notebook_entries')
      .insert({
        user_id: userId,
        folder_id: folderId,
        name,
        specialty: area,
        content
      })
      .select()
      .single();

    if (!isMountedRef.current) return null;

    if (error) {
      console.error('Error adding notebook:', error);
      return null;
    } else {
      setNotebooks(prev => [data as NotebookEntry, ...prev]);
      return data as NotebookEntry;
    }
  };

  const updateNotebook = async (
    id: string,
    updates: { name?: string; content?: string }
  ): Promise<void> => {
    if (!userId) return;

    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.content !== undefined) dbUpdates.content = updates.content;

    const { error } = await supabase
      .from('notebook_entries')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (!isMountedRef.current) return;

    if (error) {
      console.error('Error updating notebook:', error);
    } else {
      setNotebooks(prev => prev.map(n =>
        n.id === id
          ? { ...n, ...updates, updated_at: new Date().toISOString() }
          : n
      ));
    }
  };

  const deleteNotebook = async (id: string): Promise<void> => {
    if (!userId) return;

    const { error } = await supabase
      .from('notebook_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (!isMountedRef.current) return;

    if (error) {
      console.error('Error deleting notebook:', error);
    } else {
      setNotebooks(prev => prev.filter(n => n.id !== id));
    }
  };

  return { notebooks, loading, addNotebook, updateNotebook, deleteNotebook };
}
