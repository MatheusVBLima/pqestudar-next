import { Bell, Trash2, CheckCheck, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useDbNotifications, DbNotification } from '@/hooks/useDbNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'error':
      return <X className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'info':
    default:
      return <Info className="h-4 w-4 text-blue-600" />;
  }
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

const NotificationItem = ({ notification, onMarkAsRead, onRemove }: NotificationItemProps) => (
  <div className={`p-3 hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
            {notification.title}
          </h4>
          {!notification.read && <Badge variant="secondary" className="h-2 w-2 p-0 bg-primary"><span className="sr-only">Não lida</span></Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{notification.message}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
          </span>
          <div className="flex items-center gap-1">
            {!notification.read && (
              <Button variant="ghost" size="sm" onClick={() => onMarkAsRead(notification.id)} className="h-6 px-2 text-xs">
                Marcar como lida
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onRemove(notification.id)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* DB Notification Item */
const DbNotificationItem = ({ n, onMarkRead }: { n: DbNotification; onMarkRead: (id: string) => void }) => (
  <div className={`p-3 hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}>
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-1"><CheckCircle className="h-4 w-4 text-green-600" /></div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className={`text-sm font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</h4>
          {!n.is_read && <Badge variant="secondary" className="h-2 w-2 p-0 bg-primary"><span className="sr-only">Não lida</span></Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{n.body}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
          </span>
          {!n.is_read && (
            <Button variant="ghost" size="sm" onClick={() => onMarkRead(n.id)} className="h-6 px-2 text-xs">
              Marcar como lida
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
);

export const NotificationDropdown = () => {
  const { notifications, unreadCount: localUnread, markAsRead, markAllAsRead, removeNotification, clearAllNotifications } = useNotifications();
  const { notifications: dbNotifs, unreadCount: dbUnread, markRead: dbMarkRead, markAllRead: dbMarkAllRead } = useDbNotifications();

  const totalUnread = localUnread + dbUnread;

  const handleMarkAllRead = () => {
    markAllAsRead();
    dbMarkAllRead();
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-accent relative">
          <Bell className="h-4 w-4" />
          {totalUnread > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
              {totalUnread > 9 ? '9+' : totalUnread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 pb-2">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {totalUnread > 0 && <Badge variant="secondary" className="text-xs">{totalUnread} nova{totalUnread !== 1 ? 's' : ''}</Badge>}
        </div>

        {(notifications.length > 0 || dbNotifs.length > 0) && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="h-7 px-2 text-xs" disabled={totalUnread === 0}>
              <CheckCheck className="h-3 w-3 mr-1" /> Marcar todas como lidas
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAllNotifications} className="h-7 px-2 text-xs text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3 mr-1" /> Limpar local
            </Button>
          </div>
        )}

        <Separator />

        {notifications.length === 0 && dbNotifs.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="divide-y divide-border">
              {/* DB notifications first */}
              {dbNotifs.map(n => (
                <DbNotificationItem key={`db-${n.id}`} n={n} onMarkRead={dbMarkRead} />
              ))}
              {/* Local notifications */}
              {notifications.map(notification => (
                <NotificationItem key={notification.id} notification={notification} onMarkAsRead={markAsRead} onRemove={removeNotification} />
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
