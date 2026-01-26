import { useTodayDeliveries } from "@/hooks/useAccuLynxToday";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, MapPin } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TodaysDeliveriesWidgetV2() {
  const { data: deliveries, isLoading } = useTodayDeliveries();

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
                <div
                  key={delivery.id}
                  className="p-3 rounded-lg bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {delivery.job_name}
                  </p>
                  <a
                    href={delivery.map_url_primary}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{delivery.address_full}</span>
                  </a>
                </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
