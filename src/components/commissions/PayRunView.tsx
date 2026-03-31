import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Loader2 } from "lucide-react";
import {
  usePayRunList,
  usePayRunCommissions,
  useCurrentPayRun,
  type PayRun,
} from "@/hooks/usePayRuns";
import {
  formatPayRunRange,
  formatTimestampMST,
  getDeadlineCountdown,
} from "@/lib/commissionPayDateCalculations";
import { LateBadge } from "./LateBadge";

const STATUS_MAP: Record<string, { label: string; color: string; bgClass: string }> = {
  submitted: { label: "Pending", color: "text-yellow-700 dark:text-yellow-400", bgClass: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700" },
  manager_approved: { label: "Compliance OK", color: "text-blue-700 dark:text-blue-400", bgClass: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" },
  accounting_approved: { label: "Acctg OK", color: "text-purple-700 dark:text-purple-400", bgClass: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700" },
  paid: { label: "Paid", color: "text-green-700 dark:text-green-400", bgClass: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700" },
  rejected: { label: "Denied", color: "text-red-900 dark:text-red-300", bgClass: "bg-red-200 dark:bg-red-950/40 border-red-400 dark:border-red-800" },
  revision_required: { label: "Revision", color: "text-amber-700 dark:text-amber-400", bgClass: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

function CountdownTo({ deadlineIso }: { deadlineIso: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const end = new Date(deadlineIso).getTime();
  const diff = end - now;
  if (diff <= 0) {
    return <span className="text-muted-foreground text-sm">Passed</span>;
  }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="font-mono tabular-nums text-sm font-semibold">
      {h}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
    </span>
  );
}

function PayRunStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    open: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
    closed: "bg-gray-200 text-gray-700 border-gray-400 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600",
    finalized: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  };
  return (
    <Badge variant="outline" className={colorMap[status] || colorMap.open}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function PayRunView() {
  const { data: payRuns, isLoading: loadingRuns } = usePayRunList();
  const { data: currentPayRun } = useCurrentPayRun();
  const [selectedPayRunId, setSelectedPayRunId] = useState<string | undefined>();

  const activePayRunId = selectedPayRunId || currentPayRun?.id;
  const { data: commissions, isLoading: loadingCommissions } = usePayRunCommissions(activePayRunId);

  const navigate = useNavigate();

  const selectedPayRun = useMemo(
    () => (payRuns || []).find((pr) => pr.id === activePayRunId),
    [payRuns, activePayRunId]
  );

  const summary = useMemo(() => {
    const list = commissions || [];
    const approved = list.filter((c: any) => ["manager_approved", "accounting_approved", "paid"].includes(c.status));
    const pending = list.filter((c: any) => c.status === "submitted");
    const rejected = list.filter((c: any) => c.status === "revision_required" || c.status === "rejected");
    const late = list.filter((c: any) => c.is_late_submission || c.is_late_revision);
    const approvedAmount = approved.reduce((sum: number, c: any) => sum + (c.rep_commission || 0), 0);

    return {
      total: list.length,
      approved: approved.length,
      pending: pending.length,
      rejected: rejected.length,
      late: late.length,
      approvedAmount,
    };
  }, [commissions]);

  if (loadingRuns) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pay Run Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={activePayRunId || ""} onValueChange={setSelectedPayRunId}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Select pay run" />
          </SelectTrigger>
          <SelectContent>
            {(payRuns || []).map((pr) => (
              <SelectItem key={pr.id} value={pr.id}>
                {pr.period_start && pr.period_end
                  ? formatPayRunRange(pr.period_start, pr.period_end)
                  : pr.run_date}
                {pr.id === currentPayRun?.id ? " (Current)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPayRun && <PayRunStatusBadge status={selectedPayRun.status} />}
      </div>

      {selectedPayRun?.status === "open" && selectedPayRun.submission_deadline && selectedPayRun.revision_deadline && (
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deadlines (MST)</p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground">Initial submission: </span>
                  <span className="font-medium">{formatTimestampMST(selectedPayRun.submission_deadline)}</span>
                  {new Date(selectedPayRun.submission_deadline).getTime() > Date.now() && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <span className="text-muted-foreground">·</span>
                      <CountdownTo deadlineIso={selectedPayRun.submission_deadline} />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="text-muted-foreground">Revision resubmit: </span>
                  <span className="font-medium">{formatTimestampMST(selectedPayRun.revision_deadline)}</span>
                  {new Date(selectedPayRun.revision_deadline).getTime() > Date.now() && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <span className="text-muted-foreground">·</span>
                      <CountdownTo deadlineIso={selectedPayRun.revision_deadline} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {selectedPayRun && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-green-600">{summary.approved}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{summary.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{summary.late}</p>
              <p className="text-xs text-muted-foreground">Late</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-primary">{formatCurrency(summary.approvedAmount)}</p>
              <p className="text-xs text-muted-foreground">Approved $</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Commissions Table */}
      {loadingCommissions ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep</TableHead>
                <TableHead>Customer / Job</TableHead>
                <TableHead>Completed Install</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Late?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(commissions || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No commissions in this pay run.
                  </TableCell>
                </TableRow>
              ) : (
                (commissions || []).map((c: any) => {
                  const statusInfo = STATUS_MAP[c.status] || STATUS_MAP.submitted;
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/commissions/${c.id}`)}
                    >
                      <TableCell className="font-medium">{c.rep_name || c.sales_rep}</TableCell>
                      <TableCell>{c.job_name_id}</TableCell>
                      <TableCell>{c.install_date || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {c.submitted_at ? formatTimestampMST(c.submitted_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${statusInfo.bgClass} ${statusInfo.color} border`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(c.rep_commission || 0)}
                      </TableCell>
                      <TableCell>
                        <LateBadge isLateSubmission={c.is_late_submission} isLateRevision={c.is_late_revision} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
