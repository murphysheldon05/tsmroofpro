import { Announcement } from "@/hooks/useAnnouncements";
import { cn } from "@/lib/utils";
import { AlertCircle, Info, AlertTriangle, Megaphone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AnnouncementCardProps {
  announcement: Announcement;
}

const priorityConfig = {
  low: {
    icon: Info,
    className: "border-muted",
    iconClassName: "text-muted-foreground",
  },
  normal: {
    icon: Megaphone,
    className: "border-primary/30",
    iconClassName: "text-primary",
  },
  high: {
    icon: AlertTriangle,
    className: "border-yellow-500/50 bg-yellow-500/5",
    iconClassName: "text-yellow-500",
  },
  urgent: {
    icon: AlertCircle,
    className: "border-destructive/50 bg-destructive/5",
    iconClassName: "text-destructive",
  },
};

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const config = priorityConfig[announcement.priority];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-card/50 transition-all hover:bg-card/80",
        config.className
      )}
    >
      <div className="flex gap-3">
        <div className={cn("mt-0.5", config.iconClassName)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground">{announcement.title}</h3>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{announcement.content}</p>
        </div>
      </div>
    </div>
  );
}
