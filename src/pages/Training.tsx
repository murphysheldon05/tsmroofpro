import { useParams, Navigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { SearchBar } from "@/components/SearchBar";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { useResources } from "@/hooks/useResources";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, GraduationCap, Video, Send, HelpCircle } from "lucide-react";
import { VideoCard } from "@/components/training/VideoCard";
import { NewHireList } from "@/components/training/NewHireList";
import { GuidedTour } from "@/components/tutorial/GuidedTour";
import { trainingSteps } from "@/components/tutorial/tutorialSteps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const categoryConfig: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  "new-hire": {
    title: "New Hire Orientation",
    description: "Resources and information for new team members.",
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
  const { isAdmin, isManager } = useAuth();

  const config = category ? categoryConfig[category] : null;
  const Icon = config?.icon || GraduationCap;

  // Redirect non-admins away from new-hire
  if (category === "new-hire" && !isAdmin) {
    return <Navigate to="/training/documents" replace />;
  }

  // Special layout for new-hire category
  if (category === "new-hire") {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <header className="pt-4 lg:pt-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {config?.title}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {config?.description}
                </p>
              </div>
            </div>
          </header>

          {/* New Hire Queue - Admin/Manager only */}
          {(isAdmin || isManager) && (
            <NewHireList />
          )}

          {/* HR Request Forms - migrated from Forms & Requests */}
          <Card className="border-primary/20 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Request Forms
              </CardTitle>
              <CardDescription>
                Submit HR requests and general HR questions
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/requests?type=hr&subtype=simple">
                  <HelpCircle className="h-4 w-4" />
                  General HR Request
                </Link>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/requests?type=hr">
                  <UserPlus className="h-4 w-4" />
                  HR Request (New Hire onboarding)
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Orientation Resources - visible to all */}
          {isLoading ? (
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
              <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">New Hire Orientation</h3>
              <p className="text-muted-foreground">Orientation resources will appear here soon.</p>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3" data-tutorial="training-header">
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
            <div data-tutorial="training-search">
              <SearchBar className="w-full lg:w-80" />
            </div>
          </div>
        </header>

        {/* Video Library Special Layout */}
        {category === "video-library" && resources && resources.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" data-tutorial="training-content">
            {resources.map((resource) => (
              <VideoCard key={resource.id} video={resource} />
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
        <GuidedTour pageName={`training-${category || "main"}`} pageTitle={config?.title || "Training"} steps={trainingSteps} />
      </div>
    </AppLayout>
  );
}
