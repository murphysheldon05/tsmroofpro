import { Resource } from "@/hooks/useResources";
import { cn } from "@/lib/utils";
import { FileText, ExternalLink, Eye, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface ResourceCardProps {
  resource: Resource;
  compact?: boolean;
  onClick?: () => void;
}

export function ResourceCard({ resource, compact = false, onClick }: ResourceCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
      return; // If onClick is provided, let it handle the action
    }
    // Fallback: open URL if no onClick handler
    if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 p-3 rounded-lg bg-card/60 border border-primary/10 hover:bg-card/80 hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)] transition-all duration-300 text-left group"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.3)] transition-all duration-300">
          <FileText className="w-4 h-4 text-primary group-hover:drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {resource.title}
          </h4>
          <p className="text-xs text-muted-foreground">
            {resource.categories?.name || "Uncategorized"}
          </p>
        </div>
        {resource.url && (
          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
        )}
      </button>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-5 rounded-xl bg-card/80 border border-primary/15 hover:border-primary/40 hover:shadow-[0_0_25px_hsl(var(--primary)/0.15)] transition-all duration-300 cursor-pointer group",
        resource.url && "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 group-hover:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-all duration-300">
          <FileText className="w-5 h-5 text-primary group-hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
        </div>
        <Badge variant="secondary" className="text-xs">
          {resource.version}
        </Badge>
      </div>

      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {resource.title}
      </h3>

      {resource.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {resource.description}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {resource.tags?.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs">
            {tag}
          </Badge>
        ))}
        {resource.tags && resource.tags.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{resource.tags.length - 3}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(resource.updated_at), { addSuffix: true })}
        </span>
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {resource.view_count} views
        </span>
      </div>
    </div>
  );
}
