import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserSummary {
  id: string;
  user_id: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
  last_study_date: string | null;
  exerciseCount: number;
  examCount: number;
  classesStudied: number;
  totalClasses: number;
  flashcardCount: number;
  totalAccuracy: number;
  frozen: boolean;
  exam_year: string | null;
  target_institutions: string[] | null;
  target_specialty: string | null;
}

export function useAdminData(isAdmin: boolean) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchAllUsersData = async () => {
      try {
        // Fetch all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*');

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }

        // Fetch all exercises
        const { data: exercises, error: exercisesError } = await supabase
          .from('exercises')
          .select('user_id, correct_answers, total_questions');

        if (exercisesError) {
          console.error('Error fetching exercises:', exercisesError);
        }

        // Fetch all exams
        const { data: exams, error: examsError } = await supabase
          .from('exams')
          .select('user_id');

        if (examsError) {
          console.error('Error fetching exams:', examsError);
        }

        // Fetch all classes
        const { data: classes, error: classesError } = await supabase
          .from('classes')
          .select('user_id, studied');

        if (classesError) {
          console.error('Error fetching classes:', classesError);
        }

        // Fetch all flashcards
        const { data: flashcards, error: flashcardsError } = await supabase
          .from('flashcards')
          .select('user_id');

        if (flashcardsError) {
          console.error('Error fetching flashcards:', flashcardsError);
        }

        // Aggregate data per user
        const userSummaries: UserSummary[] = (profiles || []).map(profile => {
          const userExercises = (exercises || []).filter(e => e.user_id === profile.user_id);
          const userExams = (exams || []).filter(e => e.user_id === profile.user_id);
          const userClasses = (classes || []).filter(c => c.user_id === profile.user_id);
          const userFlashcards = (flashcards || []).filter(f => f.user_id === profile.user_id);

          const totalCorrect = userExercises.reduce((sum, e) => sum + e.correct_answers, 0);
          const totalQuestions = userExercises.reduce((sum, e) => sum + e.total_questions, 0);
          const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

          return {
            id: profile.id,
            user_id: profile.user_id,
            name: profile.name,
            xp: profile.xp || 0,
            level: profile.level || 1,
            streak: profile.streak || 0,
            last_study_date: profile.last_study_date,
            exerciseCount: userExercises.length,
            examCount: userExams.length,
            classesStudied: userClasses.filter(c => c.studied).length,
            totalClasses: userClasses.length,
            flashcardCount: userFlashcards.length,
            totalAccuracy: Math.round(accuracy * 10) / 10,
            frozen: profile.frozen || false,
            exam_year: (profile as any).exam_year || null,
            target_institutions: (profile as any).target_institutions || null,
            target_specialty: (profile as any).target_specialty || null
          };
        });

        setUsers(userSummaries.sort((a, b) => b.xp - a.xp));
      } catch (err) {
        console.error('Error in useAdminData:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsersData();
  }, [isAdmin]);

  const toggleFreezeUser = async (userId: string, frozen: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ frozen })
      .eq('user_id', userId);

    if (error) {
      console.error('Error toggling freeze:', error);
      return false;
    }

    setUsers(prev => prev.map(u =>
      u.user_id === userId ? { ...u, frozen } : u
    ));
    return true;
  };

  return { users, loading, selectedUserId, setSelectedUserId, toggleFreezeUser };
}
