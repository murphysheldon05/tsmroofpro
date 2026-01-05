import { Resource } from "@/hooks/useResources";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Maximize2, Clock, Eye, FileText, Download } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ResourceDetailModalProps {
  resource: Resource | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorySlug?: string;
}

export function ResourceDetailModal({
  resource,
  open,
  onOpenChange,
  categorySlug,
}: ResourceDetailModalProps) {
  const navigate = useNavigate();

  if (!resource) return null;

  const handleViewFullPage = () => {
    onOpenChange(false);
    navigate(`/sops/${categorySlug || "all"}/resource/${resource.id}`);
  };

  const handleOpenUrl = () => {
    if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-foreground">
                  {resource.title}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {resource.categories?.name || "Uncategorized"}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="flex-shrink-0">
              {resource.version}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground py-3 border-b border-border/50">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Updated {formatDistanceToNow(new Date(resource.updated_at), { addSuffix: true })}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {resource.view_count} views
            </span>
            {resource.effective_date && (
              <span className="text-xs">
                Effective: {format(new Date(resource.effective_date), "MMM d, yyyy")}
              </span>
            )}
          </div>

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 py-3 border-b border-border/50">
              {resource.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Description */}
          {resource.description && (
            <div className="py-3 border-b border-border/50">
              <p className="text-sm text-muted-foreground">{resource.description}</p>
            </div>
          )}

          {/* Body content */}
          {resource.body && (
            <ScrollArea className="flex-1 py-4">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: resource.body }}
              />
            </ScrollArea>
          )}

          {/* No body content message */}
          {!resource.body && !resource.url && !resource.file_path && (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-muted-foreground text-sm">No content available</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/50 flex-shrink-0">
          <div className="flex gap-2">
            {resource.url && (
              <Button variant="outline" size="sm" onClick={handleOpenUrl}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Link
              </Button>
            )}
            {resource.file_path && (
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
          <Button onClick={handleViewFullPage}>
            <Maximize2 className="w-4 h-4 mr-2" />
            View Full Page
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
