import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIncrementViewCount } from "@/hooks/useResources";
import { ArrowLeft, Clock, Eye, ExternalLink, Download, FileText, Calendar } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useEffect } from "react";

export default function ResourceDetail() {
  const { category, resourceId } = useParams<{ category: string; resourceId: string }>();
  const navigate = useNavigate();
  const incrementViewCount = useIncrementViewCount();

  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*, categories(name, slug)")
        .eq("id", resourceId!)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!resourceId,
  });

  // Increment view count on load
  useEffect(() => {
    if (resourceId) {
      incrementViewCount.mutate(resourceId);
    }
  }, [resourceId]);

  const handleOpenUrl = () => {
    if (resource?.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleBack = () => {
    navigate(`/sops/${category || "sales"}`);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!resource) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto text-center py-16">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Resource Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The resource you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={handleBack} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {resource.categories?.name || "Library"}
        </Button>

        {/* Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {resource.title}
                </h1>
                <p className="text-muted-foreground">
                  {resource.categories?.name || "Uncategorized"}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {resource.version}
            </Badge>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Updated {formatDistanceToNow(new Date(resource.updated_at), { addSuffix: true })}
            </span>
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {resource.view_count} views
            </span>
            {resource.effective_date && (
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Effective: {format(new Date(resource.effective_date), "MMMM d, yyyy")}
              </span>
            )}
          </div>

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {resource.tags.map((tag: string) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </header>

        {/* Description */}
        {resource.description && (
          <div className="mb-8 p-4 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-muted-foreground">{resource.description}</p>
          </div>
        )}

        {/* Actions */}
        {(resource.url || resource.file_path) && (
          <div className="flex gap-3 mb-8">
            {resource.url && (
              <Button onClick={handleOpenUrl}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open External Link
              </Button>
            )}
            {resource.file_path && (
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Document
              </Button>
            )}
          </div>
        )}

        {/* Body content */}
        {resource.body && (
          <article className="prose prose-lg dark:prose-invert max-w-none bg-card p-6 rounded-xl border border-border/50">
            <div dangerouslySetInnerHTML={{ __html: resource.body }} />
          </article>
        )}

        {/* No body content */}
        {!resource.body && !resource.url && !resource.file_path && (
          <div className="text-center py-16 bg-card rounded-xl border border-border/50">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No content available for this resource</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
