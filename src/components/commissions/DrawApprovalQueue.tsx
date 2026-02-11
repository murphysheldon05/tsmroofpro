import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useTeamDrawRequests,
  useAllDrawRequests,
  useApproveDrawRequest,
  useDenyDrawRequest,
  type DrawRequest,
} from "@/hooks/useDrawRequests";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, AlertTriangle, Loader2, DollarSign, Clock, Wallet } from "lucide-react";
import { format } from "date-fns";

export function DrawApprovalQueue() {
  const { isAdmin } = useAuth();
  const { data: teamDraws, isLoading: teamLoading } = useTeamDrawRequests();
  const { data: allDraws, isLoading: allLoading } = useAllDrawRequests();
  const approveDraw = useApproveDrawRequest();
  const denyDraw = useDenyDrawRequest();

  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");

  const draws = isAdmin ? allDraws : teamDraws;
  const isLoading = isAdmin ? allLoading : teamLoading;

  const pendingDraws = draws?.filter(d => d.status === "pending") || [];
  const approvedDraws = draws?.filter(d => d.status === "approved") || [];

  const totalPending = pendingDraws.reduce((s, d) => s + Number(d.requested_amount), 0);
  const totalOutstanding = approvedDraws.reduce((s, d) => s + Number(d.remaining_balance), 0);

  const handleApprove = (drawId: string) => {
    approveDraw.mutate(drawId);
  };

  const handleDeny = () => {
    if (!denyingId || !denyReason.trim()) return;
    denyDraw.mutate(
      { drawId: denyingId, reason: denyReason.trim() },
      {
        onSuccess: () => {
          setDenyingId(null);
          setDenyReason("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending Requests</p>
              <p className="text-xl font-bold">{pendingDraws.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pending</p>
              <p className="text-xl font-bold">${totalPending.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding Draws</p>
              <p className="text-xl font-bold">${totalOutstanding.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Table */}
      {pendingDraws.length > 0 ? (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Draw Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead>Job #</TableHead>
                  <TableHead>Job Name</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Est. Commission</TableHead>
                  <TableHead className="text-right">50% Cap</TableHead>
                  <TableHead>Over $1.5k?</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDraws.map((draw) => {
                  const estComm = Number(draw.estimated_commission || 0);
                  const cap50 = estComm > 0 ? estComm * 0.5 : null;
                  const exceedsCap = cap50 !== null && Number(draw.requested_amount) > cap50;

                  return (
                    <TableRow key={draw.id}>
                      <TableCell className="font-medium">{draw.user_name || "—"}</TableCell>
                      <TableCell>{draw.job_number}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{draw.job_name || "—"}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ${Number(draw.requested_amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {estComm > 0 ? `$${estComm.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell className={`text-right ${exceedsCap ? "text-destructive font-bold" : ""}`}>
                        {cap50 !== null ? `$${cap50.toLocaleString()}` : "—"}
                      </TableCell>
                      <TableCell>
                        {draw.requires_manager_approval ? (
                          <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Yes
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(draw.created_at), "MMM d")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-green-500/50 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                            onClick={() => handleApprove(draw.id)}
                            disabled={approveDraw.isPending}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-destructive/50 text-destructive hover:bg-destructive/10"
                            onClick={() => setDenyingId(draw.id)}
                            disabled={denyDraw.isPending}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground">No pending draw requests</p>
          </CardContent>
        </Card>
      )}

      {/* All draws history */}
      {draws && draws.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Draw Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead>Job #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draws.map((draw) => (
                  <TableRow key={draw.id}>
                    <TableCell className="font-medium">{draw.user_name || "—"}</TableCell>
                    <TableCell>{draw.job_number}</TableCell>
                    <TableCell className="text-right">${Number(draw.requested_amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <DrawStatusBadge status={draw.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      ${Number(draw.remaining_balance).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(draw.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Deny Modal */}
      <Dialog open={!!denyingId} onOpenChange={(o) => { if (!o) { setDenyingId(null); setDenyReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Deny Draw Request</DialogTitle>
            <DialogDescription>Provide a reason for denying this draw request.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder="Reason for denial (required)"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDenyingId(null); setDenyReason(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={!denyReason.trim() || denyDraw.isPending}
            >
              {denyDraw.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Deny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DrawStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="border-amber-500/50 text-amber-600">Pending</Badge>;
    case "approved":
      return <Badge variant="outline" className="border-blue-500/50 text-blue-600">Approved</Badge>;
    case "denied":
      return <Badge variant="destructive">Denied</Badge>;
    case "paid":
      return <Badge variant="outline" className="border-green-500/50 text-green-600">Disbursed</Badge>;
    case "deducted":
      return <Badge variant="outline" className="border-primary/50 text-primary">Deducted</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}
