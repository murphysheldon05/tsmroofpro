import { useState } from "react";
import { useQuickStats } from "@/hooks/useCommandCenter";
import { useTodayLaborCount, useTodayDeliveriesCount, useTodayLabor, useTodayDeliveries } from "@/hooks/useAccuLynxToday";
import { useCountUp } from "@/hooks/useCountUp";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Hammer, Truck, Shield, Clock, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDisplayName } from "@/lib/displayName";
import { cn } from "@/lib/utils";

function AnimatedNumber({ value }: { value: number }) {
  const display = useCountUp(value);
  return <>{display}</>;
}

export function QuickStatsWidget() {
  const { data: stats, isLoading: statsLoading } = useQuickStats();
  const { data: laborCount, isLoading: laborLoading } = useTodayLaborCount();
  const { data: deliveriesCount, isLoading: deliveriesLoading } = useTodayDeliveriesCount();
  const [openModal, setOpenModal] = useState<string | null>(null);

  const isLoading = statsLoading || laborLoading || deliveriesLoading;

  const statItems = [
    { key: "builds", label: "Builds Today", value: laborCount || 0, icon: Hammer, color: "text-emerald-500", bgColor: "bg-emerald-500/10", barColor: "bg-emerald-500", hoverShadow: "hover:shadow-[0_4px_20px_rgba(16,185,129,0.15)]" },
    { key: "deliveries", label: "Deliveries Today", value: deliveriesCount || 0, icon: Truck, color: "text-amber-500", bgColor: "bg-amber-500/10", barColor: "bg-amber-500", hoverShadow: "hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]" },
    { key: "warranties", label: "Open Warranties", value: stats?.openWarranties || 0, icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10", barColor: "bg-blue-500", hoverShadow: "hover:shadow-[0_4px_20px_rgba(59,130,246,0.15)]" },
    { key: "approvals", label: "Pending Approvals", value: stats?.pendingApprovals || 0, icon: Clock, color: "text-purple-500", bgColor: "bg-purple-500/10", barColor: "bg-purple-500", hoverShadow: "hover:shadow-[0_4px_20px_rgba(168,85,247,0.15)]" },
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
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((item) => (
          <Card
            key={item.label}
            className={cn(
              "relative overflow-hidden border border-border bg-card hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group",
              item.hoverShadow,
            )}
            onClick={() => setOpenModal(item.key)}
          >
            <div className={`absolute top-0 left-0 right-0 h-1 ${item.barColor}`} />
            <CardContent className="p-4 pt-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-foreground"><AnimatedNumber value={item.value} /></p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                Tap to view details →
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <BuildsModal open={openModal === "builds"} onClose={() => setOpenModal(null)} />
      <DeliveriesModal open={openModal === "deliveries"} onClose={() => setOpenModal(null)} />
      <WarrantiesModal open={openModal === "warranties"} onClose={() => setOpenModal(null)} />
      <ApprovalsModal open={openModal === "approvals"} onClose={() => setOpenModal(null)} />
    </>
  );
}

function BuildsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: builds, isLoading } = useTodayLabor();
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hammer className="w-5 h-5 text-emerald-500" />
            Today's Builds
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
        ) : !builds?.length ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Hammer className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No builds today</p>
            <p className="text-xs mt-0.5">Enjoy the breather!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[350px]">
            <div className="space-y-2">
              {builds.map(b => (
                <div key={b.id} className="p-3 rounded-lg border border-border/50 bg-card/50">
                  <p className="font-medium text-sm truncate">{b.job_name}</p>
                  {b.address_full && (
                    <a href={b.map_url_primary} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /><span className="truncate">{b.address_full}</span>
                    </a>
                  )}
                  <div className="flex gap-1.5 mt-1.5">
                    {b.roof_type && <Badge variant="outline" className="text-[10px]">{b.roof_type}</Badge>}
                    {b.squares && <Badge variant="outline" className="text-[10px]">{b.squares} sq</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { onClose(); navigate("/build-schedule"); }}>
          <ChevronRight className="w-4 h-4 mr-1" />View Full Schedule
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function DeliveriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: deliveries, isLoading } = useTodayDeliveries();
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-500" />
            Today's Deliveries
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
        ) : !deliveries?.length ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Truck className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No deliveries today</p>
            <p className="text-xs mt-0.5">All clear on the road!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[350px]">
            <div className="space-y-2">
              {deliveries.map(d => (
                <div key={d.id} className="p-3 rounded-lg border border-border/50 bg-card/50">
                  <p className="font-medium text-sm truncate">{d.job_name}</p>
                  {d.address_full && (
                    <a href={d.map_url_primary} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /><span className="truncate">{d.address_full}</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { onClose(); navigate("/delivery-schedule"); }}>
          <ChevronRight className="w-4 h-4 mr-1" />View Full Schedule
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function WarrantiesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: warranties, isLoading } = useQuery({
    queryKey: ["open-warranties-modal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warranty_requests")
        .select("id, customer_name, job_address, issue_description, status, created_at")
        .not("status", "in", '("completed","denied")')
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const getDaysOpen = (created: string) => Math.floor((Date.now() - new Date(created).getTime()) / 86400000);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Open Warranties
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
        ) : !warranties?.length ? (
          <div className="flex flex-col items-center py-6 text-muted-foreground">
            <Shield className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">All warranties resolved</p>
            <p className="text-xs mt-0.5">Nice work keeping it clean!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[350px]">
            <div className="space-y-2">
              {warranties.map((w: any) => {
                const days = getDaysOpen(w.created_at);
                return (
                  <div key={w.id} className="p-3 rounded-lg border border-border/50 bg-card/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{w.customer_name}</p>
                      <Badge variant={days > 30 ? "destructive" : days > 14 ? "secondary" : "outline"} className="text-[10px] shrink-0">
                        {days}d
                      </Badge>
                    </div>
                    {w.job_address && <p className="text-xs text-muted-foreground truncate mt-0.5">{w.job_address}</p>}
                    {w.issue_description && <p className="text-xs text-muted-foreground truncate mt-0.5">{w.issue_description}</p>}
                    <Badge variant="outline" className="text-[10px] mt-1 capitalize">{w.status}</Badge>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => { onClose(); navigate("/warranties"); }}>
          <ChevronRight className="w-4 h-4 mr-1" />View All Warranties
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  
  const { data, isLoading } = useQuery({
    queryKey: ["pending-approvals-modal"],
    queryFn: async () => {
      const commissionsRes = await supabase
        .from("commission_submissions")
        .select("id, job_name, sales_rep_name, created_at")
        .eq("status", "pending_review")
        .limit(10);

      return {
        commissions: commissionsRes.data || [],
      };
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            Pending Approvals
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
        ) : (
          <ScrollArea className="max-h-[350px]">
            <div className="space-y-3">
              {data?.commissions && data.commissions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Commission Reviews</p>
                  <div className="space-y-1.5">
                    {data.commissions.map(c => (
                      <div key={c.id} className="p-2.5 rounded-lg border border-border/50 bg-card/50">
                        <p className="font-medium text-sm truncate">{c.job_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDisplayName(c.sales_rep_name)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!data?.commissions?.length && (
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <Clock className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-sm font-medium">No pending approvals</p>
                  <p className="text-xs mt-0.5">You're all caught up!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        <div className="flex gap-2 mt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => { onClose(); navigate("/admin"); }}>
            Admin Panel
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => { onClose(); navigate("/pending-review"); }}>
            Pending Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
