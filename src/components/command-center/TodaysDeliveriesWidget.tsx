import { useTodaysDeliveries } from "@/hooks/useCommandCenter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TodaysDeliveriesWidget() {
  const { data: deliveries, isLoading } = useTodaysDeliveries();
  const navigate = useNavigate();

  const handleRowClick = (eventId: string) => {
    navigate(`/delivery-schedule?event=${eventId}`);
  };

  if (isLoading) {
    return (
      <Card variant="neon" className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="w-5 h-5 text-primary" />
            Today's Deliveries
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
          <Truck className="w-5 h-5 text-primary" />
          Today's Deliveries
          {deliveries && deliveries.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {deliveries.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!deliveries || deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Truck className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No Deliveries Scheduled Today</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-2">
              {deliveries.map((delivery) => (
                <button
                  key={delivery.id}
                  onClick={() => handleRowClick(delivery.id)}
                  className="w-full text-left p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {delivery.title}
                      </p>
                      {delivery.description && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{delivery.description}</span>
                        </p>
                      )}
                      {delivery.crews && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Crew: {delivery.crews.name}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-0">
                      Scheduled
                    </Badge>
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
