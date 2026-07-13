import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExamLog } from '@/lib/types';

export function useExams(userId: string | undefined) {
  const [exams, setExams] = useState<ExamLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching exams:', error);
    } else {
      const mapped = data.map(e => ({
        id: e.id,
        name: e.name,
        institution: e.institution,
        date: e.date,
        totalQuestions: (e.performance as any).totalQuestions,
        correctAnswers: (e.performance as any).correctAnswers,
        areas: (e.performance as any).areas || [],
        areaDetails: (e.performance as any).areaDetails || []
      }));
      setExams(mapped);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const addExam = async (exam: Omit<ExamLog, 'id'>) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('exams')
      .insert({
        user_id: userId,
        name: exam.name,
        institution: exam.institution,
        date: exam.date,
        performance: {
          totalQuestions: exam.totalQuestions,
          correctAnswers: exam.correctAnswers,
          areas: exam.areas,
          areaDetails: exam.areaDetails
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding exam:', error);
    } else {
      setExams(prev => [...prev, {
        id: data.id,
        name: data.name,
        institution: data.institution,
        date: data.date,
        totalQuestions: (data.performance as any).totalQuestions,
        correctAnswers: (data.performance as any).correctAnswers,
        areas: (data.performance as any).areas || [],
        areaDetails: (data.performance as any).areaDetails || []
      }]);
    }
  };

  const deleteExam = async (id: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting exam:', error);
    } else {
      setExams(prev => prev.filter(e => e.id !== id));
    }
  };

  return { exams, loading, addExam, deleteExam, setExams, refetch: fetchExams };
}
