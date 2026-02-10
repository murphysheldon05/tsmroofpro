import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useUserDraws,
  useActiveDrawForUser,
  useRequestDraw,
  useDrawSettings,
} from "@/hooks/useDraws";
import { useAuth } from "@/contexts/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { DollarSign, Plus, AlertTriangle, Loader2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function DrawBalanceCard() {
  const { user } = useAuth();
  const { canRequestDraws } = useRolePermissions();
  const { data: activeDraw, isLoading } = useActiveDrawForUser(user?.id);
  const { data: draws } = useUserDraws(user?.id);
  const { data: settings } = useDrawSettings();
  const requestDraw = useRequestDraw();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [reason, setReason] = useState("");

  const maxDraw = settings?.max_draw_amount ?? 4000;
  const existingBalance = activeDraw?.remaining_balance ?? 0;
  const maxAllowed = Math.max(0, maxDraw - existingBalance);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (numAmount > maxAllowed) return;
    if (!jobNumber.trim() || !reason.trim()) return;
    requestDraw.mutate(
      { amount: numAmount, job_number: jobNumber.trim(), reason: reason.trim() },
      {
        onSuccess: () => {
          setShowRequestDialog(false);
          setAmount("");
          setJobNumber("");
          setReason("");
        },
      }
    );
  };

  const pendingRequests = draws?.filter(d => d.status === "requested") || [];
  const activeDraws = draws?.filter(d => ["active", "approved"].includes(d.status)) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "requested": return <Badge variant="outline" className="border-amber-500/50 text-amber-600">Requested</Badge>;
      case "approved": return <Badge variant="outline" className="border-blue-500/50 text-blue-600">Approved</Badge>;
      case "active": return <Badge variant="outline" className="border-primary/50 text-primary">Active</Badge>;
      case "paid_off": return <Badge variant="outline" className="border-green-500/50 text-green-600">Paid Off</Badge>;
      case "denied": return <Badge variant="destructive">Denied</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) return null;

  const totalBalance = activeDraws.reduce((s, d) => s + Number(d.remaining_balance || 0), 0);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Draw Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalBalance > 0 ? (
          <div className="space-y-2">
            <p className={cn(
              "text-2xl font-extrabold",
              totalBalance >= 2000 ? "text-red-600" : "text-amber-600"
            )}>
              ${totalBalance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeDraws.length} active draw{activeDraws.length !== 1 ? "s" : ""}
            </p>
            {activeDraws.map(d => (
              <div key={d.id} className="text-xs p-2 bg-muted/30 rounded-lg flex justify-between items-center">
                <span className="font-medium">{(d as any).job_number || "—"}</span>
                <span className="font-semibold">${Number(d.remaining_balance).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active draws</p>
        )}

        {pendingRequests.length > 0 && (
          <div className="space-y-1">
            {pendingRequests.map(d => (
              <div key={d.id} className="flex items-center justify-between text-sm p-2 bg-amber-500/5 rounded-lg">
                <span>${Number(d.amount).toLocaleString()} requested</span>
                {getStatusBadge(d.status)}
              </div>
            ))}
          </div>
        )}

        {canRequestDraws && (
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10"
              onClick={() => setShowRequestDialog(true)}
            >
              <Plus className="w-3 h-3" />
              Request Draw
            </Button>

            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Request a Draw</DialogTitle>
                  <DialogDescription>Request an advance against a future commission</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Job Number *</Label>
                    <Input
                      value={jobNumber}
                      onChange={(e) => setJobNumber(e.target.value)}
                      placeholder="Enter the job number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Draw Amount *</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      max={maxAllowed}
                    />
                    <p className="text-xs text-muted-foreground">Maximum draw: ${maxDraw.toLocaleString()}</p>
                    {existingBalance > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Current balance: ${existingBalance.toLocaleString()}. You can request up to ${maxAllowed.toLocaleString()}.
                      </p>
                    )}
                    {parseFloat(amount) > maxAllowed && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Exceeds maximum allowed
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Reason *</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why do you need this advance?"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Cancel</Button>
                  <Button
                    onClick={handleSubmit}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={
                      requestDraw.isPending ||
                      !amount ||
                      !jobNumber.trim() ||
                      !reason.trim() ||
                      parseFloat(amount) <= 0 ||
                      parseFloat(amount) > maxAllowed
                    }
                  >
                    {requestDraw.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                    ) : (
                      "Submit Request"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}