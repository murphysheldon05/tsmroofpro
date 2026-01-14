import { useTodaysBuilds } from "@/hooks/useCommandCenter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Hammer, MapPin, Users, Clock } from "lucide-react";
import { EVENT_CATEGORIES, EventCategory } from "@/hooks/useProductionCalendar";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TodaysBuildsWidget() {
  const { data: builds, isLoading } = useTodaysBuilds();
  const navigate = useNavigate();

  const handleRowClick = (eventId: string) => {
    navigate(`/build-schedule?event=${eventId}`);
  };

  const getStatusBadge = (category: EventCategory) => {
    const config = EVENT_CATEGORIES[category] || EVENT_CATEGORIES.other;
    return (
      <Badge variant="outline" className={`${config.color} ${config.bgColor} border-0`}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card variant="neon" className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Hammer className="w-5 h-5 text-primary" />
            Today's Builds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="neon" className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hammer className="w-5 h-5 text-primary" />
          Today's Builds
          {builds && builds.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {builds.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!builds || builds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Hammer className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No Builds Scheduled Today</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-2">
              {builds.map((build) => (
                <button
                  key={build.id}
                  onClick={() => handleRowClick(build.id)}
                  className="w-full text-left p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {build.title}
                      </p>
                      {build.description && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{build.description}</span>
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {build.crews && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {build.crews.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(build.event_category as EventCategory)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
