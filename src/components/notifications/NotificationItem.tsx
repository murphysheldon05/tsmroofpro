import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  FileText, AlertCircle, CheckCircle, DollarSign, RefreshCw,
  UserPlus, Shield, Bell, Wrench, BookOpen, AlertTriangle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserNotification } from "@/hooks/useNotifications";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationItemProps {
  notification: UserNotification;
  onMarkRead: (id: string) => void;
  onDelete?: (id: string) => void;
}

const notificationIcons: Record<string, React.ReactNode> = {
  commission_submitted: <FileText className="h-4 w-4 text-blue-500" />,
  rejected: <RefreshCw className="h-4 w-4 text-amber-500" />,
  manager_approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  accounting_approved: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  paid: <DollarSign className="h-4 w-4 text-green-600" />,
  commission_denied: <AlertTriangle className="h-4 w-4 text-red-500" />,
  commission_rejected: <RefreshCw className="h-4 w-4 text-red-500" />,
  rejected_commission_revised: <RefreshCw className="h-4 w-4 text-amber-500" />,
  new_signup: <UserPlus className="h-4 w-4 text-blue-500" />,
  user_approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  compliance_violation: <Shield className="h-4 w-4 text-red-500" />,
  compliance_hold: <Shield className="h-4 w-4 text-amber-500" />,
  it_request: <Wrench className="h-4 w-4 text-blue-500" />,
  training_assigned: <BookOpen className="h-4 w-4 text-purple-500" />,
  announcement: <Bell className="h-4 w-4 text-blue-500" />,
  warranty: <Shield className="h-4 w-4 text-amber-500" />,
  warranty_mention: <Bell className="h-4 w-4 text-primary" />,
  warranty_comment: <Bell className="h-4 w-4 text-blue-400" />,
  warranty_status_change: <Shield className="h-4 w-4 text-amber-500" />,
  warranty_assigned: <Shield className="h-4 w-4 text-purple-500" />,
  warranty_completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  default: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
};

function getNavigationPath(notification: UserNotification, isAdmin: boolean): string | null {
  const { entity_type, entity_id } = notification;
  if (!entity_type) return null;

  switch (entity_type) {
    case 'commission':
    case 'commission_document':
    case 'commission_submission':
      return entity_id ? `/commissions/${entity_id}` : (isAdmin ? '/commission-manager' : '/commissions');
    case 'user':
      return '/admin';
    case 'it_request':
      return '/requests';
    case 'compliance':
      return '/admin?tab=ops-compliance';
    case 'warranty':
      return '/warranties';
    default:
      return null;
  }
}

export function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkRead(notification.id);
    }

    const path = getNavigationPath(notification, isAdmin ?? false);
    if (path) {
      navigate(path);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(notification.id);
  };

  const icon = notificationIcons[notification.notification_type] || notificationIcons.default;
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  return (
    <div
      onClick={handleClick}
      className={cn(
        "w-full text-left p-3 hover:bg-muted/50 transition-colors cursor-pointer group relative",
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
        <div className="flex items-start gap-1 shrink-0">
          {!notification.is_read && (
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              title="Delete notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
