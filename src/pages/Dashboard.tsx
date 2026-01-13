import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { SearchBar } from "@/components/SearchBar";
import { QuickLinks } from "@/components/dashboard/QuickLinks";
import { AnnouncementCard } from "@/components/dashboard/AnnouncementCard";
import { ResourceCard } from "@/components/dashboard/ResourceCard";
import { PendingApprovalsWidget } from "@/components/dashboard/PendingApprovalsWidget";
import { OverdueWarrantiesWidget } from "@/components/dashboard/OverdueWarrantiesWidget";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useRecentResources, usePopularResources } from "@/hooks/useResources";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Clock, Megaphone } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: announcements, isLoading: loadingAnnouncements } = useAnnouncements();
  const { data: recentResources, isLoading: loadingRecent } = useRecentResources();
  const { data: popularResources, isLoading: loadingPopular } = usePopularResources();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {firstName}
              </h1>
              <p className="text-muted-foreground mt-1">
                Here's what's happening at TSM Roofing
              </p>
            </div>
            <SearchBar className="w-full lg:w-80" />
          </div>
        </header>

        {/* Quick Links */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Access</h2>
          <QuickLinks />
        </section>

        {/* Announcements */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Announcements</h2>
          </div>
          {loadingAnnouncements ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <AnnouncementCard key={announcement.id} announcement={announcement} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No announcements at this time.</p>
          )}
        </section>

        {/* Pending Approvals - Only visible to managers/admins */}
        <PendingApprovalsWidget />

        {/* Overdue Warranties Alert - Only visible to managers/admins */}
        <OverdueWarrantiesWidget />

        {/* Resources Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recently Updated */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Recently Updated</h2>
            </div>
            {loadingRecent ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : recentResources && recentResources.length > 0 ? (
              <div className="space-y-2">
                {recentResources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} compact />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No resources yet.</p>
            )}
          </section>

          {/* Most Viewed */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Most Viewed</h2>
            </div>
            {loadingPopular ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : popularResources && popularResources.length > 0 ? (
              <div className="space-y-2">
                {popularResources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} compact />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No resources yet.</p>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
