import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useDraws, useUserDraws, useActiveDrawForUser, useDrawSettings, useRequestDraw, useApproveDraw, useDenyDraw } from "@/hooks/useDraws";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Plus, CheckCircle, XCircle, Clock, AlertTriangle, DollarSign, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInWeeks } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  requested: { label: "Requested", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  active: { label: "Active", color: "bg-blue-100 text-blue-700 border-blue-200", icon: DollarSign },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
  denied: { label: "Denied", color: "bg-red-100 text-red-700 border-red-200", icon: Ban },
  paid_off: { label: "Paid Off", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
}

function DrawStatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.requested;
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn("gap-1", cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

// ─── Sales Rep View ───
function RepDrawsView() {
  const { user } = useAuth();
  const { data: draws = [], isLoading } = useUserDraws(user?.id);
  const { data: activeDraw } = useActiveDrawForUser(user?.id);
  const { data: settings } = useDrawSettings();
  const requestDraw = useRequestDraw();
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const maxCap = settings?.max_draw_amount || 4000;
  const currentBalance = activeDraw?.remaining_balance || 0;
  const maxAllowed = Math.max(0, maxCap - currentBalance);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) { toast.error("Enter a valid amount"); return; }
    if (numAmount > maxAllowed) { toast.error(`This request would exceed the maximum draw limit of ${formatCurrency(maxCap)}.`); return; }
    if (!reason.trim()) { toast.error("Please provide a reason"); return; }
    requestDraw.mutate({ amount: numAmount, notes: reason }, {
      onSuccess: () => { setShowForm(false); setAmount(""); setReason(""); },
    });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Draws</h1>
          <p className="text-sm text-muted-foreground">Request and track cash advances against commissions</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Request a Draw
        </Button>
      </div>

      {/* Active Draw Card */}
      {activeDraw && (
        <Card className="mb-6 border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-500" /> Active Draw
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Original Amount</p>
                <p className="text-lg font-bold">{formatCurrency(activeDraw.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Remaining</p>
                <p className={cn("text-lg font-bold", activeDraw.remaining_balance > 2000 ? "text-red-600" : "text-foreground")}>
                  {formatCurrency(activeDraw.remaining_balance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Approved</p>
                <p className="text-sm">{activeDraw.approved_at ? format(new Date(activeDraw.approved_at), "MMM d, yyyy") : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Status</p>
                <DrawStatusBadge status={activeDraw.status} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draw History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Draw History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : draws.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No draws yet</p>
              <p className="text-sm">Need an advance? Request one above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {draws.map((draw) => (
                <div key={draw.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 min-h-[52px]">
                  <div className="flex items-center gap-3">
                    <DrawStatusBadge status={draw.status} />
                    <div>
                      <p className="text-sm font-medium">{formatCurrency(draw.amount)}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(draw.requested_at), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(draw.remaining_balance)} remaining</p>
                    {draw.denial_reason && <p className="text-xs text-red-500 max-w-[200px] truncate">{draw.denial_reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Draw Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a Draw</DialogTitle>
            <DialogDescription>
              Request a cash advance against future commissions. Maximum: {formatCurrency(maxCap)}.
              {currentBalance > 0 && ` Current balance: ${formatCurrency(currentBalance)}. You can request up to ${formatCurrency(maxAllowed)}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Amount</Label>
              <Input type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1" />
              {parseFloat(amount) > maxAllowed && <p className="text-sm text-destructive mt-1">Exceeds maximum of {formatCurrency(maxAllowed)}</p>}
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea placeholder="Why do you need this advance?" value={reason} onChange={e => setReason(e.target.value)} className="mt-1" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={requestDraw.isPending}>
              {requestDraw.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Manager / Admin View ───
function ManagerDrawsView() {
  const { isAdmin, role } = useAuth();
  const { data: allDraws = [], isLoading } = useDraws();
  const approveDraw = useApproveDraw();
  const denyDraw = useDenyDraw();
  const [denyId, setDenyId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const { data: settings } = useDrawSettings();

  // Fetch profile names for draws
  const userIds = [...new Set(allDraws.map(d => d.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["draw-profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const getName = (uid: string) => {
    const p = profiles.find(p => p.id === uid);
    return p?.full_name || p?.email || "Unknown";
  };

  const pendingDraws = allDraws.filter(d => d.status === "requested");
  const activeDraws = allDraws.filter(d => d.status === "active" || d.status === "approved");

  const handleDeny = () => {
    if (!denyId || !denyReason.trim()) { toast.error("Please provide a reason"); return; }
    denyDraw.mutate({ drawId: denyId, reason: denyReason }, {
      onSuccess: () => { setDenyId(null); setDenyReason(""); },
    });
  };

  const getAgingBadge = (draw: any) => {
    if (!draw.approved_at) return null;
    const weeks = differenceInWeeks(new Date(), new Date(draw.approved_at));
    if (draw.remaining_balance > 2000 && weeks >= 4) return <Badge variant="destructive" className="text-xs">4+ weeks overdue</Badge>;
    if (draw.remaining_balance > 2000 && weeks >= 3) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">3+ weeks</Badge>;
    return null;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Draws Management</h1>
          <p className="text-sm text-muted-foreground">{isAdmin ? "Company-wide" : "Your team's"} draw requests and active advances</p>
        </div>
        {isAdmin && (
          <Button variant="outline" onClick={() => window.location.href = "/admin"} className="gap-2">
            Draw Settings
          </Button>
        )}
      </div>

      {/* Pending Requests */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Pending Requests ({pendingDraws.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingDraws.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No pending draw requests</p>
          ) : (
            <div className="space-y-3">
              {pendingDraws.map(draw => (
                <div key={draw.id} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-medium text-foreground">{getName(draw.user_id)}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Requested {format(new Date(draw.requested_at), "MMM d, yyyy")}</p>
                      <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(draw.amount)}</p>
                      {draw.notes && <p className="text-sm text-muted-foreground mt-1 italic">"{draw.notes}"</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveDraw.mutate({ drawId: draw.id })} disabled={approveDraw.isPending} className="gap-1">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDenyId(draw.id)} className="gap-1">
                        <XCircle className="w-4 h-4" /> Deny
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Draws */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-500" /> Active Draws ({activeDraws.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeDraws.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No active draws</p>
          ) : (
            <div className="space-y-2">
              {activeDraws.map(draw => (
                <div key={draw.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 min-h-[52px]">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{getName(draw.user_id)}</p>
                      <p className="text-xs text-muted-foreground">Since {draw.approved_at ? format(new Date(draw.approved_at), "MMM d") : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getAgingBadge(draw)}
                    <div className="text-right">
                      <p className={cn("text-sm font-bold", draw.remaining_balance >= 2000 ? "text-red-600" : "text-foreground")}>
                        {formatCurrency(draw.remaining_balance)}
                      </p>
                      <p className="text-xs text-muted-foreground">of {formatCurrency(draw.amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deny Dialog */}
      <Dialog open={!!denyId} onOpenChange={(o) => { if (!o) { setDenyId(null); setDenyReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deny Draw Request</DialogTitle>
            <DialogDescription>Provide a reason for denying this draw request.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason for denial..." value={denyReason} onChange={e => setDenyReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDenyId(null); setDenyReason(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeny} disabled={denyDraw.isPending}>Deny Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Draws() {
  const { role, isAdmin, isManager } = useAuth();
  const isManagerRole = isAdmin || isManager || role === "sales_manager";

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {isManagerRole ? <ManagerDrawsView /> : <RepDrawsView />}
      </div>
    </AppLayout>
  );
}
