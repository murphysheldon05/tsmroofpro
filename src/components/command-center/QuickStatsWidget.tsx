import { useQuickStats } from "@/hooks/useCommandCenter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Hammer, Truck, Shield, Clock } from "lucide-react";

export function QuickStatsWidget() {
  const { data: stats, isLoading } = useQuickStats();

  const statItems = [
    {
      label: "Builds Today",
      value: stats?.buildsToday || 0,
      icon: Hammer,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Deliveries Today",
      value: stats?.deliveriesToday || 0,
      icon: Truck,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Open Warranties",
      value: stats?.openWarranties || 0,
      icon: Shield,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Pending Approvals",
      value: stats?.pendingApprovals || 0,
      icon: Clock,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card
          key={item.label}
          className="border border-border/50 bg-card/60 hover:border-primary/20 transition-all duration-200"
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
