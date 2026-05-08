import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DbNotification {
  id: string;
  notification_id: string;
  is_read: boolean;
  created_at: string;
  title: string;
  body: string;
}

const QUERY_KEY = ['db_notifications'];

interface UserNotificationRow {
  id: string;
  notification_id: string;
  is_read: boolean;
  created_at: string;
  notifications: {
    title?: string | null;
    body?: string | null;
  } | null;
}

export const useDbNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('id, notification_id, is_read, created_at, notifications(title, body)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return ((data ?? []) as UserNotificationRow[]).map((row) => ({
        id: row.id,
        notification_id: row.notification_id,
        is_read: row.is_read,
        created_at: row.created_at,
        title: row.notifications?.title ?? '',
        body: row.notifications?.body ?? '',
      })) as DbNotification[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // poll every 5 min
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading: query.isLoading,
    markRead: markReadMutation.mutate,
    markAllRead: markAllReadMutation.mutate,
  };
};
