import { useState } from "react";
import { useTodayDeliveries } from "@/hooks/useAccuLynxToday";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, MapPin, ChevronDown, ChevronUp } from "lucide-react";

export function TodaysDeliveriesSection() {
  const { data: deliveries, isLoading } = useTodayDeliveries();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-card border border-border/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Truck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Today's Deliveries</span>
        </div>
        <div className="flex gap-3 overflow-x-auto"><Skeleton className="h-20 w-56 shrink-0 rounded-lg" /><Skeleton className="h-20 w-56 shrink-0 rounded-lg" /></div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4">
      <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 w-full text-left">
        <Truck className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold flex-1">Today's Deliveries</span>
        {deliveries && deliveries.length > 0 && <Badge variant="secondary" className="text-xs">{deliveries.length}</Badge>}
        {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="mt-3">
          {!deliveries || deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries scheduled today</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {deliveries.map(d => (
                <div key={d.id} className="shrink-0 w-56 p-3 rounded-lg border border-border/50 bg-card/50 hover:border-primary/20 transition-all">
                  <p className="font-medium text-sm truncate">{d.job_name}</p>
                  {d.address_full && (
                    <a href={d.map_url_primary} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" /><span className="truncate">{d.address_full}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
