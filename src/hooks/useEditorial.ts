import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EditorialData, TopicStatus, EditorialArea, EditorialSubarea, EditorialTopic } from '@/lib/types';
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
  // Default to template if no data, ensure we have a fallback
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
        const defaultData = JSON.parse(JSON.stringify(EDITORIAL_TEMPLATE));
        const { data: newEditorial, error: createError } = await supabase
          .from('editorials')
          .insert({
            user_id: userId,
            name: 'CNRM Geral',
            data: defaultData
          } as any)
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
          data: (newEditorial as any).data || defaultData
        };

        setEditorials([defaultEditorial]);
        setSelectedEditorialId(newEditorial.id);
        setLoading(false);
        return;
      }

      // Fetch progress for all editorials (legacy support for simple status updates)
      // Future: maybe move status directly into 'data' JSON if we fully migrate
      // For now, we overlay saved progress onto the structure
      const { data: progressData, error: progressError } = await supabase
        .from('editorial_progress')
        .select('*')
        .eq('user_id', userId);

      if (progressError) {
        console.error('Error fetching editorial progress:', progressError);
      }

      // Build editorial items with their data
      const editorialItems: EditorialItem[] = editorialsData.map(ed => {
        // Use saved data structure or fall back to template
        // IMPORTANT: This allows custom topics/subareas to be loaded
        const editorial = ((ed as any).data as EditorialData) || JSON.parse(JSON.stringify(EDITORIAL_TEMPLATE));

        // Overlay progress status
        // We iterate through saved progress and try to find matching topics
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
      // Select first or restore previous selection if needed (logic can be improved)
      if (!selectedEditorialId && editorialItems.length > 0) {
        setSelectedEditorialId(editorialItems[0].id);
      }
      setLoading(false);
    };

    fetchEditorials();
  }, [userId]);

  const createEditorial = async (name: string) => {
    if (!userId) return null;

    const defaultData = JSON.parse(JSON.stringify(EDITORIAL_TEMPLATE));

    const { data: newEditorial, error } = await supabase
      .from('editorials')
      .insert({
        user_id: userId,
        name: name,
        data: defaultData
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error creating editorial:', error);
      return null;
    }

    const newItem: EditorialItem = {
      id: newEditorial.id,
      name: newEditorial.name,
      data: (newEditorial as any).data || defaultData
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

  // Helper to save entire editorial structure
  const saveEditorialStructure = async (editorialId: string, newData: EditorialData) => {
    if (!userId) return;

    // Update local state first (optimistic)
    setEditorials(prev => prev.map(ed =>
      ed.id === editorialId ? { ...ed, data: newData } : ed
    ));

    // Persist to DB
    const { error } = await supabase
      .from('editorials')
      .update({ data: newData } as any)
      .eq('id', editorialId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error saving editorial structure:', error);
      // Ideally revert state here on error
    }
  };

  const updateTopicStatus = async (areaName: string, subareaName: string, topicName: string, status: string) => {
    if (!userId || !selectedEditorialId) return;

    // 1. Update in editorial_progress table (for historical/analytics reasons mostly)
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
      console.error('Error updating editorial progress:', error);
    }

    // 2. Update structure status as well (so it persists in the JSON too)
    const current = editorials.find(e => e.id === selectedEditorialId);
    if (current) {
      const newData = JSON.parse(JSON.stringify(current.data)) as EditorialData;
      const area = newData.areas.find(a => a.name === areaName);
      if (area) {
        const subarea = area.subareas.find(s => s.name === subareaName);
        if (subarea) {
          const topic = subarea.topics.find(t => t.name === topicName);
          if (topic) {
            topic.status = status as TopicStatus;
            saveEditorialStructure(selectedEditorialId, newData);
          }
        }
      }
    }
  };

  const setEditorialData = (data: EditorialData) => {
    if (!selectedEditorialId) return;
    saveEditorialStructure(selectedEditorialId, data);
  };

  // --- STRUCTURE EDITING FUNCTIONS ---

  const deleteSubarea = async (areaId: string, subareaId: string) => {
    if (!selectedEditorialId) return;
    const newData = JSON.parse(JSON.stringify(editorialData)) as EditorialData;

    const area = newData.areas.find(a => a.id === areaId);
    if (area) {
      area.subareas = area.subareas.filter(s => s.id !== subareaId);
      await saveEditorialStructure(selectedEditorialId, newData);
    }
  };

  const renameSubarea = async (areaId: string, subareaId: string, newName: string) => {
    if (!selectedEditorialId) return;
    const newData = JSON.parse(JSON.stringify(editorialData)) as EditorialData;

    const area = newData.areas.find(a => a.id === areaId);
    if (area) {
      const subarea = area.subareas.find(s => s.id === subareaId);
      if (subarea) {
        subarea.name = newName;
        await saveEditorialStructure(selectedEditorialId, newData);
      }
    }
  };

  const deleteTopic = async (areaId: string, subareaId: string, topicId: string) => {
    if (!selectedEditorialId) return;
    const newData = JSON.parse(JSON.stringify(editorialData)) as EditorialData;

    const area = newData.areas.find(a => a.id === areaId);
    if (area) {
      const subarea = area.subareas.find(s => s.id === subareaId);
      if (subarea) {
        subarea.topics = subarea.topics.filter(t => t.id !== topicId);
        await saveEditorialStructure(selectedEditorialId, newData);
      }
    }
  };

  const renameTopic = async (areaId: string, subareaId: string, topicId: string, newName: string) => {
    if (!selectedEditorialId) return;
    const newData = JSON.parse(JSON.stringify(editorialData)) as EditorialData;

    const area = newData.areas.find(a => a.id === areaId);
    if (area) {
      const subarea = area.subareas.find(s => s.id === subareaId);
      if (subarea) {
        const topic = subarea.topics.find(t => t.id === topicId);
        if (topic) {
          topic.name = newName;
          await saveEditorialStructure(selectedEditorialId, newData);
        }
      }
    }
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
    renameEditorial,
    deleteSubarea,
    renameSubarea,
    deleteTopic,
    renameTopic
  };
}
