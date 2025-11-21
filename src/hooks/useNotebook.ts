import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotebookData, MedicalArea } from '@/lib/types';

export function useNotebook(userId: string | undefined) {
  const [notebookData, setNotebookData] = useState<NotebookData>({
    [MedicalArea.PEDIATRIA]: '',
    [MedicalArea.GO]: '',
    [MedicalArea.PREVENTIVA]: '',
    [MedicalArea.CLINICA]: '',
    [MedicalArea.CIRURGIA]: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchNotebook = async () => {
      const { data, error } = await supabase
        .from('notebook_entries')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching notebook:', error);
      } else {
        const notebook: NotebookData = {
          [MedicalArea.PEDIATRIA]: '',
          [MedicalArea.GO]: '',
          [MedicalArea.PREVENTIVA]: '',
          [MedicalArea.CLINICA]: '',
          [MedicalArea.CIRURGIA]: ''
        };

        data.forEach(entry => {
          notebook[entry.specialty as MedicalArea] = entry.content || '';
        });

        setNotebookData(notebook);
      }
      setLoading(false);
    };

    fetchNotebook();
  }, [userId]);

  const updateNotebook = async (area: MedicalArea, content: string) => {
    if (!userId) return;

    // Upsert: insert or update
    const { error } = await supabase
      .from('notebook_entries')
      .upsert({
        user_id: userId,
        specialty: area,
        content: content
      }, {
        onConflict: 'user_id,specialty'
      });

    if (error) {
      console.error('Error updating notebook:', error);
    } else {
      setNotebookData(prev => ({
        ...prev,
        [area]: content
      }));
    }
  };

  return { notebookData, loading, updateNotebook };
}
