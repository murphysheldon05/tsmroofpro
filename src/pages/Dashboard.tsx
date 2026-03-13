import { useAuth } from "@/contexts/AuthContext";
import { formatDisplayName } from "@/lib/displayName";
import { AnnouncementCard } from "@/components/dashboard/AnnouncementCard";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, BarChart3 } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: announcements, isLoading: loadingAnnouncements } = useAnnouncements();

  return (
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="pt-4 lg:pt-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground text-sm">
                Analytics, metrics, and company updates
              </p>
            </div>
          </div>
        </header>

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
      </div>
  );
}
