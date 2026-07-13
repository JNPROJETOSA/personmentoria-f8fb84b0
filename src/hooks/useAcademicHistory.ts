import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MedicalArea } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────

export type ActivityType = 'exercise' | 'exam' | 'class' | 'review';

export interface AdminExercise {
  id: string;
  date: string;
  area: string;
  topic: string;
  totalQuestions: number;
  correctAnswers: number;
  adminOrigin: boolean;
  adminInsertedBy?: string | null;
}

export interface AdminExam {
  id: string;
  name: string;
  institution: string;
  date: string;
  performance: {
    totalQuestions: number;
    correctAnswers: number;
    areas: string[];
    areaDetails: { area: string; correct: number; total: number }[];
  };
  adminOrigin: boolean;
  adminInsertedBy?: string | null;
}

export interface AdminClass {
  id: string;
  title: string;
  area: string;
  date: string;
  studied: boolean;
  priority: number;
  adminOrigin: boolean;
  adminInsertedBy?: string | null;
}

export interface AdminReview {
  id: string;
  topic: string;
  date: string;
  completed: boolean;
  priority: number;
  adminOrigin: boolean;
  adminInsertedBy?: string | null;
  area?: string;
  dueDate?: string;
}

export type AdminRecord = 
  | { type: 'exercise'; data: AdminExercise }
  | { type: 'exam'; data: AdminExam }
  | { type: 'class'; data: AdminClass }
  | { type: 'review'; data: AdminReview };

// ── Hook ───────────────────────────────────────────────────────

export function useAcademicHistory(studentUserId: string) {
  const [exercises, setExercises] = useState<AdminExercise[]>([]);
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [classes, setClasses] = useState<AdminClass[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current admin user id
  const getAdminId = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  };

  // ── Fetch all admin-origin records ──
  const fetchAll = useCallback(async () => {
    if (!studentUserId) return;
    setLoading(true);

    try {
      const [exRes, examRes, clsRes, revRes] = await Promise.all([
        supabase
          .from('exercises')
          .select('*')
          .eq('user_id', studentUserId)
          .eq('admin_origin', true)
          .order('date', { ascending: false }),
        supabase
          .from('exams')
          .select('*')
          .eq('user_id', studentUserId)
          .eq('admin_origin', true)
          .order('date', { ascending: false }),
        supabase
          .from('classes')
          .select('*')
          .eq('user_id', studentUserId)
          .eq('admin_origin', true)
          .order('date', { ascending: false }),
        supabase
          .from('reviews')
          .select('*')
          .eq('user_id', studentUserId)
          .eq('admin_origin', true)
          .order('date', { ascending: false }),
      ]);

      setExercises(
        (exRes.data || []).map((e) => ({
          id: e.id,
          date: e.date,
          area: e.specialty,
          topic: e.topic,
          totalQuestions: e.total_questions,
          correctAnswers: e.correct_answers,
          adminOrigin: true,
          adminInsertedBy: e.admin_inserted_by,
        }))
      );

      setExams(
        (examRes.data || []).map((e) => ({
          id: e.id,
          name: e.name,
          institution: e.institution,
          date: e.date,
          performance: e.performance as any,
          adminOrigin: true,
          adminInsertedBy: e.admin_inserted_by,
        }))
      );

      setClasses(
        (clsRes.data || []).map((c) => ({
          id: c.id,
          title: c.title,
          area: c.specialty,
          date: c.date,
          studied: c.studied ?? false,
          priority: c.priority,
          adminOrigin: true,
          adminInsertedBy: c.admin_inserted_by,
        }))
      );

      setReviews(
        (revRes.data || []).map((r) => ({
          id: r.id,
          topic: r.topic,
          date: r.date,
          completed: r.completed ?? false,
          priority: r.priority,
          adminOrigin: true,
          adminInsertedBy: r.admin_inserted_by,
        }))
      );
    } catch (err) {
      console.error('Error fetching academic history:', err);
    } finally {
      setLoading(false);
    }
  }, [studentUserId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Duplicate check ──
  const checkDuplicateExercise = async (date: string, topic: string, area: string): Promise<boolean> => {
    const { data } = await supabase
      .from('exercises')
      .select('id')
      .eq('user_id', studentUserId)
      .eq('date', date)
      .eq('topic', topic)
      .eq('specialty', area)
      .eq('admin_origin', true)
      .limit(1);
    return (data?.length ?? 0) > 0;
  };

  const checkDuplicateExam = async (date: string, name: string, institution: string): Promise<boolean> => {
    const { data } = await supabase
      .from('exams')
      .select('id')
      .eq('user_id', studentUserId)
      .eq('date', date)
      .eq('name', name)
      .eq('institution', institution)
      .eq('admin_origin', true)
      .limit(1);
    return (data?.length ?? 0) > 0;
  };

  const checkDuplicateClass = async (date: string, title: string, area: string): Promise<boolean> => {
    const { data } = await supabase
      .from('classes')
      .select('id')
      .eq('user_id', studentUserId)
      .eq('date', date)
      .eq('title', title)
      .eq('specialty', area)
      .eq('admin_origin', true)
      .limit(1);
    return (data?.length ?? 0) > 0;
  };

  const checkDuplicateReview = async (date: string, topic: string): Promise<boolean> => {
    const { data } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', studentUserId)
      .eq('date', date)
      .eq('topic', topic)
      .eq('admin_origin', true)
      .limit(1);
    return (data?.length ?? 0) > 0;
  };

  // ── EXERCISE CRUD ──

  const addExercise = async (input: {
    date: string;
    area: string;
    topic: string;
    totalQuestions: number;
    correctAnswers: number;
  }): Promise<boolean> => {
    const adminId = await getAdminId();
    if (!adminId) return false;

    const isDuplicate = await checkDuplicateExercise(input.date, input.topic, input.area);
    if (isDuplicate) {
      toast({
        title: 'Registro duplicado',
        description: `Já existe um exercício com o mesmo tópico, área e data para este aluno.`,
        variant: 'destructive',
      });
      return false;
    }

    const { data, error } = await supabase
      .from('exercises')
      .insert({
        user_id: studentUserId,
        date: input.date,
        specialty: input.area,
        topic: input.topic,
        total_questions: input.totalQuestions,
        correct_answers: input.correctAnswers,
        admin_origin: true,
        admin_inserted_by: adminId,
        admin_inserted_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding exercise:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return false;
    }

    setExercises((prev) => [
      {
        id: data.id,
        date: data.date,
        area: data.specialty,
        topic: data.topic,
        totalQuestions: data.total_questions,
        correctAnswers: data.correct_answers,
        adminOrigin: true,
        adminInsertedBy: data.admin_inserted_by,
      },
      ...prev,
    ]);
    return true;
  };

  const updateExercise = async (id: string, updates: Partial<{
    date: string;
    area: string;
    topic: string;
    totalQuestions: number;
    correctAnswers: number;
  }>): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.area) dbUpdates.specialty = updates.area;
    if (updates.topic) dbUpdates.topic = updates.topic;
    if (updates.totalQuestions !== undefined) dbUpdates.total_questions = updates.totalQuestions;
    if (updates.correctAnswers !== undefined) dbUpdates.correct_answers = updates.correctAnswers;

    const { error } = await supabase
      .from('exercises')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', studentUserId);

    if (error) {
      console.error('Error updating exercise:', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }

    setExercises((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    return true;
  };

  const deleteExercise = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', id)
      .eq('user_id', studentUserId);

    if (error) {
      console.error('Error deleting exercise:', error);
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return false;
    }

    setExercises((prev) => prev.filter((e) => e.id !== id));
    return true;
  };

  // ── EXAM CRUD ──

  const addExam = async (input: {
    name: string;
    institution: string;
    date: string;
    totalQuestions: number;
    correctAnswers: number;
    areas: string[];
    areaDetails: { area: string; correct: number; total: number }[];
  }): Promise<boolean> => {
    const adminId = await getAdminId();
    if (!adminId) return false;

    const isDuplicate = await checkDuplicateExam(input.date, input.name, input.institution);
    if (isDuplicate) {
      toast({
        title: 'Registro duplicado',
        description: `Já existe uma prova com o mesmo nome, instituição e data para este aluno.`,
        variant: 'destructive',
      });
      return false;
    }

    const { data, error } = await supabase
      .from('exams')
      .insert({
        user_id: studentUserId,
        name: input.name,
        institution: input.institution,
        date: input.date,
        performance: {
          totalQuestions: input.totalQuestions,
          correctAnswers: input.correctAnswers,
          areas: input.areas,
          areaDetails: input.areaDetails,
        },
        admin_origin: true,
        admin_inserted_by: adminId,
        admin_inserted_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding exam:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return false;
    }

    setExams((prev) => [
      {
        id: data.id,
        name: data.name,
        institution: data.institution,
        date: data.date,
        performance: data.performance as any,
        adminOrigin: true,
        adminInsertedBy: data.admin_inserted_by,
      },
      ...prev,
    ]);
    return true;
  };

  const updateExam = async (id: string, updates: Partial<{
    name: string;
    institution: string;
    date: string;
    performance: any;
  }>): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.institution) dbUpdates.institution = updates.institution;
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.performance) dbUpdates.performance = updates.performance;

    const { error } = await supabase
      .from('exams')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', studentUserId);

    if (error) {
      console.error('Error updating exam:', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }

    setExams((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    return true;
  };

  const deleteExam = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id)
      .eq('user_id', studentUserId);

    if (error) {
      console.error('Error deleting exam:', error);
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return false;
    }

    setExams((prev) => prev.filter((e) => e.id !== id));
    return true;
  };

  // ── CLASS CRUD ──

  const addClass = async (input: {
    title: string;
    area: string;
    date: string;
    studied: boolean;
    priority: number;
  }): Promise<boolean> => {
    const adminId = await getAdminId();
    if (!adminId) return false;

    const isDuplicate = await checkDuplicateClass(input.date, input.title, input.area);
    if (isDuplicate) {
      toast({
        title: 'Registro duplicado',
        description: `Já existe uma aula com o mesmo título, área e data para este aluno.`,
        variant: 'destructive',
      });
      return false;
    }

    const { data, error } = await supabase
      .from('classes')
      .insert({
        user_id: studentUserId,
        title: input.title,
        specialty: input.area,
        date: input.date,
        studied: input.studied,
        priority: input.priority,
        admin_origin: true,
        admin_inserted_by: adminId,
        admin_inserted_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding class:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return false;
    }

    setClasses((prev) => [
      {
        id: data.id,
        title: data.title,
        area: data.specialty,
        date: data.date,
        studied: data.studied ?? false,
        priority: data.priority,
        adminOrigin: true,
        adminInsertedBy: data.admin_inserted_by,
      },
      ...prev,
    ]);
    return true;
  };

  const updateClass = async (id: string, updates: Partial<{
    title: string;
    area: string;
    date: string;
    studied: boolean;
    priority: number;
  }>): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.area) dbUpdates.specialty = updates.area;
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.studied !== undefined) dbUpdates.studied = updates.studied;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;

    const { error } = await supabase
      .from('classes')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', studentUserId);

    if (error) {
      console.error('Error updating class:', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }

    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
    return true;
  };

  const deleteClass = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)
      .eq('user_id', studentUserId);

    if (error) {
      console.error('Error deleting class:', error);
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return false;
    }

    setClasses((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  // ── REVIEW CRUD ──

  const addReview = async (input: {
    topic: string;
    date: string;
    completed: boolean;
    priority: number;
    area?: string;
    dueDate?: string;
  }): Promise<boolean> => {
    const adminId = await getAdminId();
    if (!adminId) return false;

    const isDuplicate = await checkDuplicateReview(input.date, input.topic);
    if (isDuplicate) {
      toast({
        title: 'Registro duplicado',
        description: `Já existe uma revisão com o mesmo tópico e data para este aluno.`,
        variant: 'destructive',
      });
      return false;
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: studentUserId,
        topic: input.topic,
        date: input.date,
        completed: input.completed,
        priority: input.priority,
        area: input.area || 'Geral',
        due_date: input.dueDate || input.date,
        admin_origin: true,
        admin_inserted_by: adminId,
        admin_inserted_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) {
      console.error('Error adding review:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return false;
    }

    setReviews((prev) => [
      {
        id: data.id,
        topic: data.topic,
        date: data.date,
        completed: data.completed ?? false,
        priority: data.priority,
        adminOrigin: true,
        adminInsertedBy: data.admin_inserted_by,
        area: (data as any).area,
        dueDate: (data as any).due_date,
      },
      ...prev,
    ]);
    return true;
  };

  const updateReview = async (id: string, updates: Partial<{
    topic: string;
    date: string;
    completed: boolean;
    priority: number;
    area: string;
    dueDate: string;
  }>): Promise<boolean> => {
    const dbUpdates: any = {};
    if (updates.topic) dbUpdates.topic = updates.topic;
    if (updates.date) dbUpdates.date = updates.date;
    if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.area) dbUpdates.area = updates.area;
    if (updates.dueDate) dbUpdates.due_date = updates.dueDate;

    const { error } = await supabase
      .from('reviews')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', studentUserId);

    if (error) {
      console.error('Error updating review:', error);
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
      return false;
    }

    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
    return true;
  };

  const deleteReview = async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .eq('user_id', studentUserId);

    if (error) {
      console.error('Error deleting review:', error);
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return false;
    }

    setReviews((prev) => prev.filter((r) => r.id !== id));
    return true;
  };

  // ── Combined records for display ──
  const allRecords: AdminRecord[] = [
    ...exercises.map((e) => ({ type: 'exercise' as const, data: e })),
    ...exams.map((e) => ({ type: 'exam' as const, data: e })),
    ...classes.map((c) => ({ type: 'class' as const, data: c })),
    ...reviews.map((r) => ({ type: 'review' as const, data: r })),
  ].sort((a, b) => {
    const dateA = 'date' in a.data ? a.data.date : '';
    const dateB = 'date' in b.data ? b.data.date : '';
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return {
    exercises,
    exams,
    classes,
    reviews,
    allRecords,
    loading,
    refetch: fetchAll,
    // Exercise
    addExercise,
    updateExercise,
    deleteExercise,
    // Exam
    addExam,
    updateExam,
    deleteExam,
    // Class
    addClass,
    updateClass,
    deleteClass,
    // Review
    addReview,
    updateReview,
    deleteReview,
  };
}
