
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type NotificationType = 'Aviso' | 'Assinatura' | 'Material' | 'Outro';

export interface Notification {
    id: string;
    student_id: string;
    sender_id: string;
    title?: string;
    message: string;
    type: NotificationType;
    read: boolean;
    created_at: string;
}

export function useNotifications(studentId?: string) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const fetchNotifications = useCallback(async () => {
        if (!studentId) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setNotifications(data || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            // Don't show toast on fetch error to avoid spamming if permissible
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    const sendNotification = async (message: string, title?: string, type: NotificationType = 'Aviso') => {
        if (!studentId) return false;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user logged in');

            const { error } = await supabase
                .from('notifications')
                .insert({
                    student_id: studentId,
                    sender_id: user.id,
                    message,
                    title,
                    type
                });

            if (error) throw error;

            toast({ title: 'Notificação enviada!' });
            fetchNotifications();
            return true;
        } catch (error) {
            console.error('Error sending notification:', error);
            toast({
                title: 'Erro ao enviar',
                description: 'Não foi possível enviar a notificação.',
                variant: 'destructive'
            });
            return false;
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);

            if (error) throw error;

            toast({ title: 'Notificação removida!' });
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            return true;
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast({
                title: 'Erro ao remover',
                variant: 'destructive'
            });
            return false;
        }
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);

            if (error) throw error;

            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
        } catch (error) {
            console.error('Error marking as read', error);
        }
    }

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return {
        notifications,
        loading,
        sendNotification,
        deleteNotification,
        markAsRead,
        refresh: fetchNotifications
    };
}
