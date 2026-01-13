import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, format } from 'date-fns';

export interface DayAgenda {
  id?: string;
  dayOfWeek: number;
  tasks: string[];
  completedIndices: number[];
}

export interface WeeklyAgendaData {
  weekStart: string;
  days: DayAgenda[];
}

export function useWeeklyAgenda(userId?: string) {
  const [agenda, setAgenda] = useState<WeeklyAgendaData | null>(null);
  const [loading, setLoading] = useState(true);

  const getWeekStart = useCallback(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
    return format(weekStart, 'yyyy-MM-dd');
  }, []);

  const fetchAgenda = useCallback(async () => {
    try {
      const weekStart = getWeekStart();
      
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('weekly_agenda')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('week_start', weekStart);

      if (error) {
        console.error('Error fetching agenda:', error);
        return;
      }

      const days: DayAgenda[] = [];
      for (let i = 0; i < 7; i++) {
        const dayData = data?.find(d => d.day_of_week === i);
        days.push({
          id: dayData?.id,
          dayOfWeek: i,
          tasks: dayData?.tasks || [],
          completedIndices: (dayData as any)?.completed_indices || []
        });
      }

      setAgenda({ weekStart, days });
    } catch (err) {
      console.error('Error in useWeeklyAgenda:', err);
    } finally {
      setLoading(false);
    }
  }, [getWeekStart, userId]);

  const updateDayTasks = useCallback(async (dayOfWeek: number, tasks: string[], completedIndices?: number[]) => {
    try {
      const weekStart = getWeekStart();
      
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        targetUserId = user.id;
      }

      const updateData: any = {
        user_id: targetUserId,
        week_start: weekStart,
        day_of_week: dayOfWeek,
        tasks
      };

      if (completedIndices !== undefined) {
        updateData.completed_indices = completedIndices;
      }

      const { error } = await supabase
        .from('weekly_agenda')
        .upsert(updateData, {
          onConflict: 'user_id,week_start,day_of_week'
        });

      if (error) {
        console.error('Error updating agenda:', error);
        return;
      }

      // Update local state
      setAgenda(prev => {
        if (!prev) return prev;
        const newDays = prev.days.map(d => 
          d.dayOfWeek === dayOfWeek 
            ? { ...d, tasks, completedIndices: completedIndices ?? d.completedIndices } 
            : d
        );
        return { ...prev, days: newDays };
      });
    } catch (err) {
      console.error('Error updating day tasks:', err);
    }
  }, [getWeekStart, userId]);

  const toggleTaskCompletion = useCallback(async (dayOfWeek: number, taskIndex: number) => {
    if (!agenda) return;
    
    const dayAgenda = agenda.days.find(d => d.dayOfWeek === dayOfWeek);
    if (!dayAgenda) return;
    
    const currentCompleted = dayAgenda.completedIndices || [];
    const isCompleted = currentCompleted.includes(taskIndex);
    
    const newCompleted = isCompleted
      ? currentCompleted.filter(i => i !== taskIndex)
      : [...currentCompleted, taskIndex];
    
    await updateDayTasks(dayOfWeek, dayAgenda.tasks, newCompleted);
  }, [agenda, updateDayTasks]);

  useEffect(() => {
    fetchAgenda();
  }, [fetchAgenda]);

  return { agenda, loading, updateDayTasks, toggleTaskCompletion, refetch: fetchAgenda };
}
