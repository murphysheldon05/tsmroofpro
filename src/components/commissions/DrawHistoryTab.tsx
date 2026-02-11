import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMyDrawRequests, useDrawBalance } from "@/hooks/useDrawRequests";
import { Loader2, Wallet } from "lucide-react";
import { format } from "date-fns";

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

export function DrawHistoryTab() {
  const { data: draws, isLoading } = useMyDrawRequests();
  const { data: balance } = useDrawBalance();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Draws</p>
              <p className="text-xl font-bold">{balance?.activeCount || 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Outstanding Balance</p>
              <p className="text-xl font-bold text-amber-600">
                ${(balance?.totalOutstanding || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      {draws && draws.length > 0 ? (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Draw History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draws.map((draw) => (
                  <TableRow key={draw.id}>
                    <TableCell className="font-medium">{draw.job_number}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${Number(draw.requested_amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <DrawStatusBadge status={draw.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(draw.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {draw.approved_at
                        ? format(new Date(draw.approved_at), "MMM d, yyyy")
                        : draw.denied_at
                        ? format(new Date(draw.denied_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {draw.denial_reason || draw.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <Wallet className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No draw requests yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
