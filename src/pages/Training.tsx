import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SearchBar } from "@/components/SearchBar";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { useResources } from "@/hooks/useResources";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, GraduationCap, Video, Play } from "lucide-react";

const categoryConfig: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  "new-hire": {
    title: "New Hire Orientation",
    description: "Welcome to TSM Roofing! Complete these materials to get started.",
    icon: UserPlus,
  },
  "role-training": {
    title: "Role-Based Training",
    description: "Training tracks tailored to your specific role.",
    icon: GraduationCap,
  },
  "video-library": {
    title: "Video Library",
    description: "Training videos and tutorials for continuous learning.",
    icon: Video,
  },
};

export default function Training() {
  const { category } = useParams<{ category: string }>();
  const { data: resources, isLoading } = useResources(category);

  const config = category ? categoryConfig[category] : null;
  const Icon = config?.icon || GraduationCap;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {config?.title || "Training"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {config?.description || "Access training materials and videos"}
                </p>
              </div>
            </div>
            <SearchBar className="w-full lg:w-80" />
          </div>
        </header>

        {/* Video Library Special Layout */}
        {category === "video-library" && resources && resources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {resources.map((resource) => (
              <div
                key={resource.id}
                onClick={() => resource.url && window.open(resource.url, "_blank")}
                className="group cursor-pointer"
              >
                <div className="aspect-video bg-card rounded-xl border border-border/50 overflow-hidden relative mb-3 group-hover:border-primary/30 transition-colors">
                  <div className="absolute inset-0 flex items-center justify-center bg-secondary/50">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                      <Play className="w-8 h-8 text-primary ml-1" />
                    </div>
                  </div>
                </div>
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {resource.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {resource.description}
                </p>
              </div>
            ))}
          </div>
        ) : isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : resources && resources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No training materials found</h3>
            <p className="text-muted-foreground">Check back later for new content.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
