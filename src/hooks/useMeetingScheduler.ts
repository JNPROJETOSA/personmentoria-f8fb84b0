
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { differenceInHours } from 'date-fns';

export interface MeetingSlot {
    id: string;
    mentor_id: string;
    student_id: string | null;
    student_name?: string | null;
    start_time: string; // ISO
    end_time: string;   // ISO
    created_at: string;
    mentor?: {
        name: string;
    }
}

export function useMeetingScheduler(userId: string | undefined, isMentor: boolean) {
    const [slots, setSlots] = useState<MeetingSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Fetch slots based on role
    const fetchSlots = useCallback(async () => {
        if (!userId) return;
        setLoading(true);

        try {
            let query = supabase
                .from('meeting_slots')
                .select(`
                    *,
                    mentor:mentor_id(name)
                `)
                .order('start_time', { ascending: true });

            if (isMentor) {
                // Mentor sees ONLY their own slots
                query = query.eq('mentor_id', userId);
            } else {
                // Student sees:
                // 1. Available slots (student_id starts as null) AND future
                // 2. OR their own booked slots
                // The RLS policy handles most visibility, but we can filter for UI clarity
                query = query.gte('start_time', new Date().toISOString());
            }

            const { data, error } = await query;

            if (error) throw error;

            // Client-side filtering if needed (Policy allows Students to see available OR own)
            // We want to separate them usually, but for raw list it's fine.
            // Let's filter slightly for students to ensure "Available" means "Really Available" (student_id null)
            // But we also want to show "My Booked".

            setSlots((data as any) || []);

        } catch (error) {
            console.error('Error fetching slots:', error);
            toast({
                title: 'Erro ao carregar agenda',
                description: 'Não foi possível buscar os horários.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }, [userId, isMentor, toast]);

    // Mentor: Create Slots
    const createSlots = async (newSlots: { start: Date; end: Date }[]) => {
        if (!userId || !isMentor) return;
        setLoading(true);

        try {
            const inserts = newSlots.map(s => ({
                mentor_id: userId,
                start_time: s.start.toISOString(),
                end_time: s.end.toISOString(),
                student_id: null
            }));

            const { error } = await supabase
                .from('meeting_slots')
                .insert(inserts);

            if (error) throw error;

            toast({ title: 'Horários criados com sucesso!' });
            fetchSlots();

        } catch (error) {
            console.error('Error creating slots:', error);
            toast({
                title: 'Erro ao criar horários',
                description: 'Verifique se não há sobreposição.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // Student: Book Meeting (RPC)
    const bookMeeting = async (slotId: string, studentName?: string) => {
        if (!userId) return;
        setLoading(true);

        try {
            // Call the secure database function
            const { data, error } = await supabase
                .rpc('book_meeting', {
                    slot_id: slotId,
                    student_name: studentName || 'Aluno'
                });

            if (error) throw error;

            const result = data as { success: boolean; message: string };

            if (result.success) {
                toast({
                    title: 'Agendamento Confirmado! 📅',
                    description: result.message,
                });
                fetchSlots(); // Refresh to see update
            } else {
                toast({
                    title: 'Não foi possível agendar',
                    description: result.message,
                    variant: 'destructive'
                });
            }

        } catch (error) {
            console.error('Error booking meeting:', error);
            toast({
                title: 'Erro no servidor',
                description: 'Tente novamente mais tarde.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // Shared: Cancel Meeting
    const cancelMeeting = async (slotId: string, startTimeIso: string) => {
        // Rule: 12h notice for students
        if (!isMentor) {
            const hoursDiff = differenceInHours(new Date(startTimeIso), new Date());
            if (hoursDiff < 12) {
                toast({
                    title: 'Cancelamento Bloqueado',
                    description: 'Você só pode cancelar com 12 horas de antecedência.',
                    variant: 'destructive'
                });
                return;
            }
        }

        setLoading(true);
        try {
            // Mentor can DELETE the slot or simplify unbook?
            // Requirement: "Se o mentor cancelar, deve sumir para o aluno e liberar o horário novamente (caso o horário continue disponível)."
            // "Liberar o horário novamente" implies keeping the slot but removing the student.
            // "Sumir para o aluno" implies deleting if the mentor is removing the Availability.
            // But "Se o mentor cancelar... liberar o horário" means Unbooking.
            // Let's assume Mentor cancels the Booking (Unbooks) -> Slot becomes free.
            // Or Mentor deletes the Slot entirely.
            // Let's support Unbooking (Update student_id = null).

            const { error } = await supabase
                .from('meeting_slots')
                .update({ student_id: null })
                .eq('id', slotId);

            if (error) throw error;

            toast({
                title: 'Reunião cancelada',
                description: 'O horário foi liberado novamente.'
            });
            fetchSlots();

        } catch (error: any) {
            console.error('Error cancelling meeting:', error);
            toast({
                title: 'Erro ao cancelar',
                description: 'Não foi possível processar o cancelamento.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    // Mentor: Delete Slot (Remove availability entirely)
    const deleteSlot = async (slotId: string) => {
        if (!isMentor) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('meeting_slots')
                .delete()
                .eq('id', slotId);

            if (error) throw error;
            toast({ title: 'Horário removido da agenda' });
            fetchSlots();
        } catch (e) {
            toast({ title: 'Erro ao remover', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }

    return {
        slots,
        loading,
        fetchSlots,
        createSlots,
        bookMeeting,
        cancelMeeting,
        deleteSlot
    };
}
