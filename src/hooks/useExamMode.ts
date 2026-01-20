import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExamModeData, ExamSession } from '@/lib/types';

export function useExamMode(userId: string | undefined) {
  const [examModeData, setExamModeData] = useState<ExamModeData>({ sessions: [], mantra: '' });
  const [loading, setLoading] = useState(true);

  // Ensure data is always defined
  useEffect(() => {
    if (!loading && !examModeData) {
      setExamModeData({ sessions: [], mantra: '' });
    }
  }, [loading, examModeData]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchExamMode = async () => {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error fetching exam sessions:', error);
      } else {
        const sessions: ExamSession[] = data.map(s => {
          const sAny = s as any;
          return {
            id: s.id,
            date: s.completed_at.split('T')[0],
            config: s.config as any,
            distractions: (s.distractions as any) || [],
            emotions: (s.post_emotions as any) || undefined,
            diary: s.diary_notes || undefined,
            strategy: (s.emotional_state as any)?.strategy || undefined,
            completed: true,
            actualDuration: (s.config as any).totalTime || 0,
            totalQuestions: sAny.total_questions || 0,
            correctAnswers: sAny.correct_answers || 0
          };
        });

        // Get mantra from most recent session or default
        const mantra = sessions[0]?.config?.mantra || '';

        setExamModeData({ sessions, mantra });
      }
      setLoading(false);
    };

    fetchExamMode();
  }, [userId]);

  const addSession = async (session: Omit<ExamSession, 'id'>) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('exam_sessions')
      .insert({
        user_id: userId,
        completed_at: new Date(session.date).toISOString(),
        config: session.config as any,
        distractions: session.distractions as any,
        post_emotions: session.emotions as any,
        diary_notes: session.diary,
        emotional_state: { strategy: session.strategy },
        total_questions: session.totalQuestions || 0,
        correct_answers: session.correctAnswers || 0
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding exam session:', error);
    } else {
      const dataAny = data as any;
      const newSession: ExamSession = {
        id: dataAny.id,
        date: dataAny.completed_at.split('T')[0],
        config: dataAny.config as any,
        distractions: (dataAny.distractions as any) || [],
        emotions: (dataAny.post_emotions as any) || undefined,
        diary: dataAny.diary_notes || undefined,
        strategy: (dataAny.emotional_state as any)?.strategy || undefined,
        completed: true,
        actualDuration: (dataAny.config as any).totalTime || 0,
        totalQuestions: dataAny.total_questions || 0,
        correctAnswers: dataAny.correct_answers || 0
      };

      setExamModeData(prev => ({
        mantra: session.config.mantra || prev.mantra,
        sessions: [newSession, ...prev.sessions]
      }));
    }
  };

  const updateMantra = (mantra: string) => {
    setExamModeData(prev => ({ ...prev, mantra }));
  };

  return { examModeData, loading, addSession, updateMantra, setExamModeData };
}
