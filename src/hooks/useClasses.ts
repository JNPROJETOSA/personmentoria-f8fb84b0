import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClassItem } from '@/lib/types';

export function useClasses(userId: string | undefined) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchClasses = async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching classes:', error);
      } else {
        const mapped = data.map(c => ({
          id: c.id,
          title: c.title,
          area: c.specialty as any,
          date: c.date,
          studied: c.studied,
          priority: c.priority as 1 | 2 | 3
        }));
        setClasses(mapped);
      }
      setLoading(false);
    };

    fetchClasses();
  }, [userId]);

  const addClass = async (classItem: Omit<ClassItem, 'id'>) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('classes')
      .insert({
        user_id: userId,
        title: classItem.title,
        specialty: classItem.area,
        date: classItem.date,
        priority: classItem.priority,
        studied: classItem.studied
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding class:', error);
    } else {
      setClasses(prev => [...prev, {
        id: data.id,
        title: data.title,
        area: data.specialty as any,
        date: data.date,
        studied: data.studied,
        priority: data.priority as 1 | 2 | 3
      }]);
    }
  };

  const updateClass = async (id: string, updates: Partial<ClassItem>) => {
    if (!userId) return;

    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.area) dbUpdates.specialty = updates.area;
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.studied !== undefined) dbUpdates.studied = updates.studied;

    const { error } = await supabase
      .from('classes')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating class:', error);
    } else {
      setClasses(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    }
  };

  const deleteClass = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting class:', error);
    } else {
      setClasses(prev => prev.filter(c => c.id !== id));
    }
  };

  return { classes, loading, addClass, updateClass, deleteClass, setClasses };
}
