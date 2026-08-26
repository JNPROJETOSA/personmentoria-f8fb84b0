import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DayAgendaTemplate {
  id?: string;
  dayOfWeek: number; // 0=Domingo, 1=Segunda, ..., 6=Sábado
  tasks: string[];
}

export function useWeeklyAgendaTemplate(userId?: string) {
  const [templateDays, setTemplateDays] = useState<DayAgendaTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplate = useCallback(async () => {
    try {
      setLoading(true);

      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('weekly_agenda_template' as any)
        .select('*')
        .eq('user_id', targetUserId);

      if (error) {
        console.error('Error fetching weekly agenda template:', error);
      }

      const days: DayAgendaTemplate[] = [];
      for (let i = 0; i < 7; i++) {
        const dayData = (data as any[])?.find(d => d.day_of_week === i);
        days.push({
          id: dayData?.id,
          dayOfWeek: i,
          tasks: dayData?.tasks || []
        });
      }

      setTemplateDays(days);
    } catch (err) {
      console.error('Error in useWeeklyAgendaTemplate:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveDayTemplate = useCallback(async (dayOfWeek: number, tasks: string[]) => {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        targetUserId = user.id;
      }

      const { error } = await supabase
        .from('weekly_agenda_template' as any)
        .upsert({
          user_id: targetUserId,
          day_of_week: dayOfWeek,
          tasks,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,day_of_week'
        });

      if (error) {
        console.error('Error saving day template:', error);
        return false;
      }

      setTemplateDays(prev => {
        return prev.map(d => d.dayOfWeek === dayOfWeek ? { ...d, tasks } : d);
      });
      return true;
    } catch (err) {
      console.error('Error in saveDayTemplate:', err);
      return false;
    }
  }, [userId]);

  const saveFullTemplate = useCallback(async (days: { dayOfWeek: number; tasks: string[] }[]) => {
    try {
      let targetUserId = userId;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        targetUserId = user.id;
      }

      const upsertRows = days.map(d => ({
        user_id: targetUserId,
        day_of_week: d.dayOfWeek,
        tasks: d.tasks,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('weekly_agenda_template' as any)
        .upsert(upsertRows, {
          onConflict: 'user_id,day_of_week'
        });

      if (error) {
        console.error('Error saving full template:', error);
        return false;
      }

      await fetchTemplate();
      return true;
    } catch (err) {
      console.error('Error in saveFullTemplate:', err);
      return false;
    }
  }, [userId, fetchTemplate]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  return {
    templateDays,
    loading,
    saveDayTemplate,
    saveFullTemplate,
    refetchTemplate: fetchTemplate
  };
}
