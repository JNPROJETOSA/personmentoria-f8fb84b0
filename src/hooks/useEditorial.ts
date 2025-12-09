import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EditorialData, TopicStatus } from '@/lib/types';
import { EDITORIAL_TEMPLATE } from '@/lib/constants';

export interface EditorialItem {
  id: string;
  name: string;
  data: EditorialData;
}

export function useEditorial(userId: string | undefined) {
  const [editorials, setEditorials] = useState<EditorialItem[]>([]);
  const [selectedEditorialId, setSelectedEditorialId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get the currently selected editorial data
  const currentEditorial = editorials.find(e => e.id === selectedEditorialId);
  const editorialData = currentEditorial?.data || JSON.parse(JSON.stringify(EDITORIAL_TEMPLATE));

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchEditorials = async () => {
      // Fetch all editorials for this user
      const { data: editorialsData, error: editorialsError } = await supabase
        .from('editorials')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (editorialsError) {
        console.error('Error fetching editorials:', editorialsError);
        setLoading(false);
        return;
      }

      // If no editorials exist, create a default one
      if (!editorialsData || editorialsData.length === 0) {
        const { data: newEditorial, error: createError } = await supabase
          .from('editorials')
          .insert({
            user_id: userId,
            name: 'CNRM Geral'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating default editorial:', createError);
          setLoading(false);
          return;
        }

        const defaultEditorial: EditorialItem = {
          id: newEditorial.id,
          name: newEditorial.name,
          data: JSON.parse(JSON.stringify(EDITORIAL_TEMPLATE))
        };

        setEditorials([defaultEditorial]);
        setSelectedEditorialId(newEditorial.id);
        setLoading(false);
        return;
      }

      // Fetch progress for all editorials
      const { data: progressData, error: progressError } = await supabase
        .from('editorial_progress')
        .select('*')
        .eq('user_id', userId);

      if (progressError) {
        console.error('Error fetching editorial progress:', progressError);
      }

      // Build editorial items with their data
      const editorialItems: EditorialItem[] = editorialsData.map(ed => {
        const editorial = JSON.parse(JSON.stringify(EDITORIAL_TEMPLATE)) as EditorialData;
        
        // Apply saved progress for this editorial
        const edProgress = progressData?.filter(p => p.editorial_id === ed.id) || [];
        edProgress.forEach(entry => {
          const area = editorial.areas.find(a => a.name === entry.area);
          if (area) {
            const subarea = area.subareas.find(s => s.name === entry.sub_area);
            if (subarea) {
              const topic = subarea.topics.find(t => t.name === entry.topic);
              if (topic) {
                topic.status = entry.status as TopicStatus;
              }
            }
          }
        });

        return {
          id: ed.id,
          name: ed.name,
          data: editorial
        };
      });

      setEditorials(editorialItems);
      setSelectedEditorialId(editorialItems[0]?.id || null);
      setLoading(false);
    };

    fetchEditorials();
  }, [userId]);

  const createEditorial = async (name: string) => {
    if (!userId) return null;

    const { data: newEditorial, error } = await supabase
      .from('editorials')
      .insert({
        user_id: userId,
        name: name
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating editorial:', error);
      return null;
    }

    const newItem: EditorialItem = {
      id: newEditorial.id,
      name: newEditorial.name,
      data: JSON.parse(JSON.stringify(EDITORIAL_TEMPLATE))
    };

    setEditorials(prev => [...prev, newItem]);
    setSelectedEditorialId(newEditorial.id);
    return newEditorial.id;
  };

  const deleteEditorial = async (editorialId: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('editorials')
      .delete()
      .eq('id', editorialId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting editorial:', error);
      return;
    }

    setEditorials(prev => {
      const remaining = prev.filter(e => e.id !== editorialId);
      if (selectedEditorialId === editorialId && remaining.length > 0) {
        setSelectedEditorialId(remaining[0].id);
      }
      return remaining;
    });
  };

  const renameEditorial = async (editorialId: string, newName: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('editorials')
      .update({ name: newName })
      .eq('id', editorialId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error renaming editorial:', error);
      return;
    }

    setEditorials(prev => prev.map(e => 
      e.id === editorialId ? { ...e, name: newName } : e
    ));
  };

  const updateTopicStatus = async (areaName: string, subareaName: string, topicName: string, status: string) => {
    if (!userId || !selectedEditorialId) return;

    const { error } = await supabase
      .from('editorial_progress')
      .upsert({
        user_id: userId,
        editorial_id: selectedEditorialId,
        area: areaName,
        sub_area: subareaName,
        topic: topicName,
        status: status
      }, {
        onConflict: 'user_id,area,sub_area,topic'
      });

    if (error) {
      console.error('Error updating editorial:', error);
    } else {
      // Update local state
      setEditorials(prev => prev.map(ed => {
        if (ed.id !== selectedEditorialId) return ed;
        
        const newData = { ...ed.data };
        const area = newData.areas.find(a => a.name === areaName);
        if (area) {
          const subarea = area.subareas.find(s => s.name === subareaName);
          if (subarea) {
            const topic = subarea.topics.find(t => t.name === topicName);
            if (topic) {
              topic.status = status as TopicStatus;
            }
          }
        }
        return { ...ed, data: newData };
      }));
    }
  };

  const setEditorialData = (data: EditorialData) => {
    if (!selectedEditorialId) return;
    
    setEditorials(prev => prev.map(ed => 
      ed.id === selectedEditorialId ? { ...ed, data } : ed
    ));
  };

  return { 
    editorials,
    selectedEditorialId,
    setSelectedEditorialId,
    editorialData, 
    loading, 
    updateTopicStatus, 
    setEditorialData,
    createEditorial,
    deleteEditorial,
    renameEditorial
  };
}
