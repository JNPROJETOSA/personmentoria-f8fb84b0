
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StudyStrategy {
    id: string;
    student_id: string;
    macro_strategy: string | null;
    micro_strategy: string | null;
    updated_at: string | null;
    updated_by: string | null;
}

export function useStudyStrategy(studentId?: string) {
    const [strategy, setStrategy] = useState<StudyStrategy | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchStrategy = useCallback(async () => {
        if (!studentId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('study_strategies')
                .select('*')
                .eq('student_id', studentId)
                .maybeSingle();

            if (error) throw error;
            setStrategy(data);
        } catch (error) {
            console.error('Error fetching study strategy:', error);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    const saveStrategy = async (macro: string, micro: string) => {
        if (!studentId) return false;
        try {
            // Upsert needs to know if it's an update or insert.
            // Since student_id is unique, upsert on student_id works well.

            const payload: any = {
                student_id: studentId,
                micro_strategy: micro,
            };

            // Only include macro_strategy if it's being updated (to avoid potential permission issues if we send the same value but maybe triggered?)
            // Actually, for Mentors, if they send the same macro value, checking DISTINCT in trigger might pass, but safer to just include it if allowed.
            // But the requirement is that Mentors cannot update Macro.
            // If we send it, the trigger checks if it CHANGED. 
            // So if a Mentor sends the EXISTING macro value, it shouldn't trigger the exception.
            // However, the easier way for the UI is to just pass what's in the state.

            payload.macro_strategy = macro;

            const { data, error } = await supabase
                .from('study_strategies')
                .upsert(payload, { onConflict: 'student_id' })
                .select()
                .single();

            if (error) {
                // Check if it's our custom trigger error
                if (error.message.includes('Mentors allowed only update micro_strategy')) {
                    toast({
                        title: 'Permissão negada',
                        description: 'Mentores só podem editar a Estratégia Micro.',
                        variant: 'destructive'
                    });
                    return false;
                }
                throw error;
            }

            setStrategy(data);
            toast({ title: 'Estratégia salva com sucesso!' });
            return true;
        } catch (error) {
            console.error('Error saving strategy:', error);
            toast({
                title: 'Erro ao salvar',
                description: 'Não foi possível salvar a estratégia.',
                variant: 'destructive'
            });
            return false;
        }
    };

    useEffect(() => {
        fetchStrategy();
    }, [fetchStrategy]);

    return {
        strategy,
        loading,
        saveStrategy,
        refresh: fetchStrategy
    };
}
