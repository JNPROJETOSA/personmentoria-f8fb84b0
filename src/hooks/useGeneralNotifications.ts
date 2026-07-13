import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GeneralNotification } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export function useGeneralNotifications(userId: string | undefined, isAdmin: boolean = false) {
  const [notifications, setNotifications] = useState<GeneralNotification[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<GeneralNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all notifications (for Admin view)
  const fetchAllNotifications = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('general_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching general notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch pending active notifications for a student
  const fetchPendingNotifications = useCallback(async () => {
    if (!userId) {
      setPendingNotifications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 1. Get all active general notifications
      const { data: activeNotifs, error: activeErr } = await supabase
        .from('general_notifications')
        .select('*')
        .eq('active', true);

      if (activeErr) throw activeErr;

      if (!activeNotifs || activeNotifs.length === 0) {
        setPendingNotifications([]);
        return;
      }

      // 2. Get the student's read logs
      const { data: readLogs, error: readErr } = await supabase
        .from('general_notification_reads')
        .select('notification_id, version')
        .eq('user_id', userId);

      if (readErr) throw readErr;

      // 3. Filter notifications that haven't been read in their current version
      const pending = activeNotifs.filter(notif => {
        const hasRead = (readLogs || []).some(
          log => log.notification_id === notif.id && log.version === notif.version
        );
        return !hasRead;
      });

      // Sort by version/created_at ascending so oldest is shown first
      pending.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      setPendingNotifications(pending);
    } catch (err) {
      console.error('Error fetching pending notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Mark a notification as read for the user
  const markAsRead = async (notificationId: string, version: number) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('general_notification_reads')
        .insert({
          notification_id: notificationId,
          user_id: userId,
          version: version,
        });

      if (error) throw error;

      // Update local state by removing it from pending list
      setPendingNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Create a new notification (Admin)
  const createNotification = async (title: string, message: string, active: boolean) => {
    if (!isAdmin || !userId) return;

    try {
      const { error } = await supabase
        .from('general_notifications')
        .insert({
          title,
          message,
          active,
          version: 1,
          created_by: userId,
        });

      if (error) throw error;

      toast({
        title: 'Notificação criada',
        description: 'A notificação geral foi cadastrada com sucesso.',
      });

      fetchAllNotifications();
    } catch (err) {
      console.error('Error creating general notification:', err);
      toast({
        title: 'Erro ao criar',
        description: 'Não foi possível cadastrar a notificação.',
        variant: 'destructive',
      });
    }
  };

  // Update notification content / active status (Admin)
  const updateNotification = async (id: string, updates: Partial<GeneralNotification>) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('general_notifications')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Notificação atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });

      fetchAllNotifications();
    } catch (err) {
      console.error('Error updating general notification:', err);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    }
  };

  // Republicar notification (Admin): Increments version to reset read states
  const republishNotification = async (id: string, currentVersion: number) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('general_notifications')
        .update({
          version: currentVersion + 1,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Notificação republicada',
        description: `Nova publicação criada (Versão ${currentVersion + 1}). Aparecerá para todos os alunos.`,
      });

      fetchAllNotifications();
    } catch (err) {
      console.error('Error republishing general notification:', err);
      toast({
        title: 'Erro ao republicar',
        description: 'Não foi possível republicar a notificação.',
        variant: 'destructive',
      });
    }
  };

  // Delete notification (Admin)
  const deleteNotification = async (id: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('general_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Notificação excluída',
        description: 'A notificação geral foi removida.',
      });

      fetchAllNotifications();
    } catch (err) {
      console.error('Error deleting general notification:', err);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover a notificação.',
        variant: 'destructive',
      });
    }
  };

  // Initial load
  useEffect(() => {
    if (isAdmin) {
      fetchAllNotifications();
    }
    fetchPendingNotifications();
  }, [isAdmin, userId, fetchAllNotifications, fetchPendingNotifications]);

  return {
    notifications,
    pendingNotifications,
    loading,
    refetchAll: fetchAllNotifications,
    refetchPending: fetchPendingNotifications,
    createNotification,
    updateNotification,
    republishNotification,
    deleteNotification,
    markAsRead,
  };
}
