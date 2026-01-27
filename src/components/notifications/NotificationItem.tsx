import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { FileText, AlertCircle, CheckCircle, DollarSign, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNotification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: UserNotification;
  onMarkRead: (id: string) => void;
}

const notificationIcons: Record<string, React.ReactNode> = {
  commission_submitted: <FileText className="h-4 w-4 text-blue-500" />,
  revision_required: <RefreshCw className="h-4 w-4 text-amber-500" />,
  manager_approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  accounting_approved: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  paid: <DollarSign className="h-4 w-4 text-green-600" />,
  default: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
};

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Mark as read
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }

    // Navigate to relevant page
    if (notification.entity_type === 'commission' && notification.entity_id) {
      navigate(`/commission-documents/${notification.entity_id}`);
    }
  };

  const icon = notificationIcons[notification.notification_type] || notificationIcons.default;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left p-3 hover:bg-muted/50 transition-colors",
        !notification.is_read && "bg-primary/5"
      )}
    >
      <div className="flex gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm leading-tight",
            !notification.is_read && "font-medium"
          )}>
            {notification.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {timeAgo}
          </p>
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
        )}
      </div>
    </button>
  );
}
