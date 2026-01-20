import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MedicalArea } from '@/lib/types';

export interface NotebookFolder {
    id: string;
    user_id: string;
    area: MedicalArea;
    name: string;
    created_at: string;
    updated_at: string;
}

export function useNotebookFolders(userId: string | undefined) {
    const [folders, setFolders] = useState<NotebookFolder[]>([]);
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
                .from('notebook_folders')
                .select('*')
                .eq('user_id', userId)
                .order('area', { ascending: true })
                .order('name', { ascending: true });

            if (!isMountedRef.current) return;

            if (error) {
                console.error('Error fetching notebook folders:', error);
            } else {
                setFolders(data as NotebookFolder[]);
            }
            setLoading(false);
        };

        fetchFolders();
    }, [userId]);

    const addFolder = async (area: MedicalArea, name: string): Promise<NotebookFolder | null> => {
        if (!userId) return null;

        const { data, error } = await supabase
            .from('notebook_folders')
            .insert({
                user_id: userId,
                area,
                name
            })
            .select()
            .single();

        if (!isMountedRef.current) return null;

        if (error) {
            console.error('Error adding folder:', error);
            return null;
        } else {
            setFolders(prev => [...prev, data as NotebookFolder]);
            return data as NotebookFolder;
        }
    };

    const updateFolder = async (id: string, name: string): Promise<void> => {
        if (!userId) return;

        const { error } = await supabase
            .from('notebook_folders')
            .update({ name, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', userId);

        if (!isMountedRef.current) return;

        if (error) {
            console.error('Error updating folder:', error);
        } else {
            setFolders(prev => prev.map(f =>
                f.id === id ? { ...f, name, updated_at: new Date().toISOString() } : f
            ));
        }
    };

    const deleteFolder = async (id: string): Promise<void> => {
        if (!userId) return;

        // Notebooks in this folder will have folder_id set to NULL due to ON DELETE SET NULL
        const { error } = await supabase
            .from('notebook_folders')
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
