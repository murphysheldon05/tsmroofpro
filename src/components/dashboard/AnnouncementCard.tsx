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
    className: "border-muted hover:border-muted-foreground/30",
    iconClassName: "text-muted-foreground",
  },
  normal: {
    icon: Megaphone,
    className: "border-primary/30 hover:border-primary/50 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]",
    iconClassName: "text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]",
  },
  high: {
    icon: AlertTriangle,
    className: "border-yellow-500/50 bg-yellow-500/5 hover:border-yellow-500/70 hover:shadow-[0_0_20px_hsl(45,100%,50%,0.15)]",
    iconClassName: "text-yellow-500 drop-shadow-[0_0_6px_hsl(45,100%,50%,0.5)]",
  },
  urgent: {
    icon: AlertCircle,
    className: "border-destructive/50 bg-destructive/5 hover:border-destructive/70 hover:shadow-[0_0_20px_hsl(var(--destructive)/0.15)]",
    iconClassName: "text-destructive drop-shadow-[0_0_6px_hsl(var(--destructive)/0.5)]",
  },
};

export function AnnouncementCard({ announcement }: AnnouncementCardProps) {
  const config = priorityConfig[announcement.priority];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border bg-card/60 transition-all duration-300",
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
