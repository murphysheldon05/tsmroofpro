import { useState } from "react";
import { useQuickStats } from "@/hooks/useCommandCenter";
import { useTodayLaborCount, useTodayDeliveriesCount, useTodayLabor, useTodayDeliveries } from "@/hooks/useAccuLynxToday";
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

export function QuickStatsWidget() {
  const { data: stats, isLoading: statsLoading } = useQuickStats();
  const { data: laborCount, isLoading: laborLoading } = useTodayLaborCount();
  const { data: deliveriesCount, isLoading: deliveriesLoading } = useTodayDeliveriesCount();
  const [openModal, setOpenModal] = useState<string | null>(null);

  const isLoading = statsLoading || laborLoading || deliveriesLoading;

  const statItems = [
    { key: "builds", label: "Builds Today", value: laborCount || 0, icon: Hammer, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { key: "deliveries", label: "Deliveries Today", value: deliveriesCount || 0, icon: Truck, color: "text-amber-500", bgColor: "bg-amber-500/10" },
    { key: "warranties", label: "Open Warranties", value: stats?.openWarranties || 0, icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { key: "approvals", label: "Pending Approvals", value: stats?.pendingApprovals || 0, icon: Clock, color: "text-purple-500", bgColor: "bg-purple-500/10" },
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
            className="border border-border/50 bg-card/60 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
            onClick={() => setOpenModal(item.key)}
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
          <p className="text-sm text-muted-foreground py-4">No builds scheduled today.</p>
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
          <p className="text-sm text-muted-foreground py-4">No deliveries scheduled today.</p>
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
          <p className="text-sm text-muted-foreground py-4">No open warranty claims.</p>
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
      const [usersRes, commissionsRes] = await Promise.all([
        supabase.from("pending_approvals").select("id, entity_id, created_at").eq("status", "pending").eq("entity_type", "user"),
        supabase.from("commission_submissions").select("id, job_name, sales_rep_name, created_at").eq("status", "pending_review").limit(10),
      ]);
      
      // Get profile names for pending users
      const userIds = (usersRes.data || []).map(u => u.entity_id);
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: p } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
        profiles = p || [];
      }

      return {
        users: (usersRes.data || []).map(u => {
          const profile = profiles.find(p => p.id === u.entity_id);
          return { ...u, name: formatDisplayName(profile?.full_name, profile?.email) || "Unknown", email: profile?.email || "" };
        }),
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
              {data?.users && data.users.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">User Signups</p>
                  <div className="space-y-1.5">
                    {data.users.map(u => (
                      <div key={u.id} className="p-2.5 rounded-lg border border-border/50 bg-card/50">
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
              {(!data?.users?.length && !data?.commissions?.length) && (
                <p className="text-sm text-muted-foreground py-4">No pending approvals.</p>
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
