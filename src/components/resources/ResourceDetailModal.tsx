import { Resource } from "@/hooks/useResources";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Maximize2, Clock, Eye, FileText, Download, CheckCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  if (!resource) return null;

  const handleViewFullPage = () => {
    onOpenChange(false);
    navigate(`/playbook-library/${categorySlug || "all"}/resource/${resource.id}`);
  };

  const handleOpenUrl = () => {
    if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  // Extract quick steps from body content
  const extractQuickSteps = (html: string): string[] => {
    const steps: string[] = [];
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const listItems = tempDiv.querySelectorAll("li");
    listItems.forEach((item, index) => {
      if (index < 5 && item.textContent) {
        steps.push(item.textContent.trim().slice(0, 80) + (item.textContent.length > 80 ? "..." : ""));
      }
    });
    return steps;
  };

  const quickSteps = resource.body ? extractQuickSteps(resource.body) : [];

  const Content = (
    <div className="flex flex-col h-full min-h-0">
      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground py-3 border-b border-border/50">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
          Updated {formatDistanceToNow(new Date(resource.updated_at), { addSuffix: true })}
        </span>
        <span className="flex items-center gap-1.5">
          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
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

      {/* Quick Steps Summary */}
      {quickSteps.length > 0 && (
        <div className="p-3 my-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            Quick Steps
          </h3>
          <ol className="space-y-1.5">
            {quickSteps.map((step, index) => (
              <li key={index} className="flex gap-2 text-xs sm:text-sm">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ol>
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

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/50 flex-shrink-0">
        <div className="flex gap-2 w-full sm:w-auto">
          {resource.url && (
            <Button variant="outline" size="sm" onClick={handleOpenUrl} className="flex-1 sm:flex-none">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Link
            </Button>
          )}
          {resource.file_path && (
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
        </div>
        <Button onClick={handleViewFullPage} className="w-full sm:w-auto">
          <Maximize2 className="w-4 h-4 mr-2" />
          View Full Page
        </Button>
      </div>
    </div>
  );

  const HeaderContent = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <span className="text-lg sm:text-xl font-semibold text-foreground leading-tight block">
            {resource.title}
          </span>
          <p className="text-sm text-muted-foreground mt-1">
            {resource.categories?.name || "Uncategorized"}
          </p>
        </div>
      </div>
      <Badge variant="secondary" className="flex-shrink-0">
        {resource.version}
      </Badge>
    </div>
  );

  // Use Drawer on mobile for better touch experience
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="sr-only">{resource.title}</DrawerTitle>
            {HeaderContent}
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-auto">{Content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="sr-only">{resource.title}</DialogTitle>
          {HeaderContent}
        </DialogHeader>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
