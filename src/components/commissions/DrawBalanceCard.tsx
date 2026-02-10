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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useUserDraws,
  useActiveDrawForUser,
  useRequestDraw,
  useDrawSettings,
  useDrawApplications,
} from "@/hooks/useDraws";
import { useAuth } from "@/contexts/AuthContext";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { DollarSign, Plus, Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function DrawBalanceCard() {
  const { user } = useAuth();
  const { canRequestDraws } = useRolePermissions();
  const { data: activeDraw, isLoading } = useActiveDrawForUser(user?.id);
  const { data: draws } = useUserDraws(user?.id);
  const { data: settings } = useDrawSettings();
  const requestDraw = useRequestDraw();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const maxDraw = settings?.max_draw_amount ?? 4000;
  const existingBalance = activeDraw?.remaining_balance ?? 0;
  const maxAllowed = Math.max(0, maxDraw - existingBalance);

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    if (numAmount > maxAllowed) return;
    requestDraw.mutate({ amount: numAmount, notes: notes || undefined });
    setShowRequestDialog(false);
    setAmount("");
    setNotes("");
  };

  const pendingRequests = draws?.filter(d => d.status === "requested") || [];

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

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Draw Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activeDraw ? (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Original Amount</span>
                <span className="font-medium">${Number(activeDraw.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Applied from Commissions</span>
                <span className="font-medium text-green-600">
                  -${(Number(activeDraw.amount) - Number(activeDraw.remaining_balance)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-border/50 pt-1 mt-1">
                <span>Remaining Balance</span>
                <span className={Number(activeDraw.remaining_balance) > 0 ? "text-amber-600" : "text-green-600"}>
                  ${Number(activeDraw.remaining_balance).toLocaleString()}
                </span>
              </div>
              {activeDraw.approved_at && (
                <p className="text-xs text-muted-foreground">
                  Approved {format(new Date(activeDraw.approved_at), "MMM d, yyyy")}
                </p>
              )}
            </div>
            {getStatusBadge(activeDraw.status)}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No active draw</p>
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
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Plus className="w-3 h-3" />
                Request Draw
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request Draw / Advance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Request an advance against future commissions. Maximum: ${maxAllowed.toLocaleString()}
                </p>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    max={maxAllowed}
                  />
                  {parseFloat(amount) > maxAllowed && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Exceeds maximum allowed (${maxAllowed.toLocaleString()})
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Reason / Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Why do you need this draw?"
                  />
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={
                    requestDraw.isPending ||
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    parseFloat(amount) > maxAllowed
                  }
                >
                  {requestDraw.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
                  ) : (
                    "Submit Draw Request"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
