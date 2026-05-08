import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
  actionType?: 'account_deletion' | 'course_completion' | 'system_update' | 'general';
  metadata?: Record<string, unknown>;
}

type StoredNotification = Omit<Notification, 'timestamp'> & { timestamp: string };

const NOTIFICATIONS_KEY = 'app_notifications';
const MAX_NOTIFICATIONS = 50;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      try {
        const parsed: Notification[] = (JSON.parse(stored) as StoredNotification[]).map((n) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(parsed);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false
    };

    console.log('🔔 Adicionando notificação:', newNotification);

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, MAX_NOTIFICATIONS);
      console.log('📋 Total de notificações:', updated.length, 'Não lidas:', updated.filter(n => !n.read).length);
      return updated;
    });

    // Show toast notification
    toast({
      title: notification.title,
      description: notification.message,
      variant: notification.type === 'error' ? 'destructive' : 'default',
    });

    return newNotification.id;
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Simulate account deletion notification
  const simulateAccountDeletion = (username: string = 'Usuário', reason: string = 'Solicitação do usuário') => {
    addNotification({
      title: 'Conta Deletada',
      message: `A conta do usuário "${username}" foi deletada com sucesso.`,
      type: 'warning',
      actionType: 'account_deletion',
      metadata: {
        username,
        reason,
        deletionDate: new Date().toISOString()
      }
    });
  };

  // Get counts
  const unreadCount = notifications.filter(n => !n.read).length;
  const totalCount = notifications.length;

  return {
    notifications,
    unreadCount,
    totalCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    simulateAccountDeletion
  };
};
