import { useState, useMemo, useEffect } from "react";
import {
  formatPayRunRange,
  formatTimestampMST,
  getCurrentDeadlineInfo,
  getCurrentPayRunPeriod,
  getCurrentPaydayInfo,
  getNextPayRunPeriod,
  getFridayDateStringForPeriodStart,
  formatPayDateShort,
  isBeforeRevisionDeadline,
} from "@/lib/commissionPayDateCalculations";
import { usePayRunList, ensurePayRunExists } from "@/hooks/usePayRuns";
import { useNavigate } from "react-router-dom";
import {
  useManagerCommissions,
  useManagerSummary,
  useApproveCommissionDoc,
  useRejectCommissionDoc,
  useImportCommission,
  useAllReps,
} from "@/hooks/useCommissionManager";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Settings,
  Clock,
  FileCheck,
  CheckCircle,
  Banknote,
  Check,
  X,
  Download,
  Upload,
  Loader2,
  CalendarRange,
  AlertTriangle,
} from "lucide-react";
import { PayRunView } from "@/components/commissions/PayRunView";
import { PayRunWeekAccordion, type CommissionRow } from "@/components/commissions/PayRunWeekAccordion";
import { PayRunHoldingArea } from "@/components/commissions/PayRunHoldingArea";
import { CommissionFilterBar, useFilteredCommissions, type FilterState } from "@/components/commissions/CommissionFilterBar";
import { LateBadge } from "@/components/commissions/LateBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const STATUS_MAP: Record<string, { label: string; color: string; bgClass: string }> = {
  submitted: { label: "Pending Compliance", color: "text-yellow-700 dark:text-yellow-400", bgClass: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700" },
  manager_approved: { label: "Compliance Approved", color: "text-blue-700 dark:text-blue-400", bgClass: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" },
  accounting_approved: { label: "Accounting Approved", color: "text-purple-700 dark:text-purple-400", bgClass: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700" },
  paid: { label: "Paid", color: "text-green-700 dark:text-green-400", bgClass: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700" },
  rejected: { label: "Denied", color: "text-red-900 dark:text-red-300", bgClass: "bg-red-200 dark:bg-red-950/40 border-red-400 dark:border-red-800" },
  revision_required: { label: "Revision Required", color: "text-amber-700 dark:text-amber-400", bgClass: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(amount);
}

function StatusBadge({ status, revisionCount }: { status: string; revisionCount?: number }) {
  const info = STATUS_MAP[status] || { label: status, color: "text-gray-600", bgClass: "bg-gray-100 border-gray-300" };
  const wasRevised = (revisionCount ?? 0) > 0 && status !== "revision_required" && status !== "rejected";
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className={`${info.bgClass} ${info.color} border`}>
        {info.label}
      </Badge>
      {wasRevised && (
        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-[10px]">
          Revised
        </Badge>
      )}
      {status === "rejected" && (
        <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border-red-400 dark:border-red-700 text-[10px]">
          Final
        </Badge>
      )}
    </div>
  );
}

function PayRunInfoBanner() {
  const payday = getCurrentPaydayInfo();
  const currentPeriod = getCurrentPayRunPeriod();
  const deadlines = getCurrentDeadlineInfo();
  const currentPeriodPayDate = formatPayDateShort(
    getFridayDateStringForPeriodStart(currentPeriod.periodStart)
  );

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* This Week's Payday */}
      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/60 dark:bg-green-950/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Banknote className="w-4 h-4 text-green-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
            This Week's Payday
          </span>
        </div>
        <p className="text-lg font-bold text-green-900 dark:text-green-200">
          {payday.payDateDisplay}
        </p>
        <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">
          Pay Run: {payday.periodDisplay}
        </p>
      </div>

      {/* Current Submission Period */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarRange className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
            Current Period
          </span>
        </div>
        <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
          {formatPayRunRange(currentPeriod.periodStart, currentPeriod.periodEnd)}
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
          Pay Date: {currentPeriodPayDate}
        </p>
      </div>

      {/* Deadlines row */}
      <div className="lg:col-span-2 rounded-xl border bg-muted/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Submission cutoff:</span>
            <span className="font-medium text-foreground">{deadlines.submissionDeadline}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Friday build grace:</span>
            <span className="font-medium text-foreground">{deadlines.fridayBuildGrace}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">Correction cutoff:</span>
            <span className="font-medium text-foreground">{deadlines.revisionDeadline}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommissionManager() {
  const navigate = useNavigate();
  const { data: summary, isLoading: summaryLoading } = useManagerSummary();
  const { data: allCommissions, isLoading: commissionsLoading } = useManagerCommissions();
  const approveCommission = useApproveCommissionDoc();
  const rejectCommission = useRejectCommissionDoc();
  const importCommission = useImportCommission();
  const { data: allReps } = useAllReps();
  const { data: payRuns } = usePayRunList();
  const [queuePayRunFilter, setQueuePayRunFilter] = useState("all");
  const [formTypeFilter, setFormTypeFilter] = useState("all");

  useEffect(() => {
    void (async () => {
      await ensurePayRunExists(getCurrentPayRunPeriod().periodStart);
      await ensurePayRunExists(getNextPayRunPeriod().periodStart);
    })();
  }, []);

  const payRunLabelById = useMemo(() => {
    const m: Record<string, string> = {};
    (payRuns || []).forEach((pr) => {
      if (pr.period_start && pr.period_end) {
        m[pr.id] = formatPayRunRange(pr.period_start, pr.period_end);
      }
    });
    return m;
  }, [payRuns]);

  const [activeTab, setActiveTab] = useState("weeks");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; jobName: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSource, setRejectSource] = useState<"compliance" | "accounting">("compliance");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importData, setImportData] = useState({
    rep_id: "",
    job_name: "",
    job_date: "",
    amount: "",
    mark_as_paid: false,
  });

  // Unified filters for week view
  const [weekFilters, setWeekFilters] = useState<FilterState>({
    status: "all",
    rep: "all",
    week: "all",
    search: "",
    sort: "date_desc",
  });

  // Filters for Payment History tab
  const [historyRepFilter, setHistoryRepFilter] = useState("all");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");
  const [historyDateFrom, setHistoryDateFrom] = useState("");
  const [historyDateTo, setHistoryDateTo] = useState("");

  const complianceQueue = useMemo(() => {
    let list = (allCommissions || []).filter((c) => c.status === "submitted");
    if (queuePayRunFilter !== "all") {
      list = list.filter((c: any) => c.pay_run_id === queuePayRunFilter);
    }
    if (formTypeFilter !== "all") {
      list = list.filter((c: any) => (c.form_type || "standard") === formTypeFilter);
    }
    return list;
  }, [allCommissions, queuePayRunFilter, formTypeFilter]);

  const accountingQueue = useMemo(() => {
    let list = (allCommissions || []).filter((c) => c.status === "manager_approved");
    if (queuePayRunFilter !== "all") {
      list = list.filter((c: any) => c.pay_run_id === queuePayRunFilter);
    }
    if (formTypeFilter !== "all") {
      list = list.filter((c: any) => (c.form_type || "standard") === formTypeFilter);
    }
    return list;
  }, [allCommissions, queuePayRunFilter, formTypeFilter]);

  const paymentHistory = useMemo(() => {
    let filtered = allCommissions || [];

    if (historyRepFilter !== "all") {
      filtered = filtered.filter((c) => c.created_by === historyRepFilter || c.sales_rep_id === historyRepFilter);
    }
    if (historyStatusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === historyStatusFilter);
    }
    if (historyDateFrom) {
      filtered = filtered.filter((c) => new Date(c.created_at) >= new Date(historyDateFrom));
    }
    if (historyDateTo) {
      const to = new Date(historyDateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter((c) => new Date(c.created_at) <= to);
    }

    return filtered;
  }, [allCommissions, historyRepFilter, historyStatusFilter, historyDateFrom, historyDateTo]);

  // Group commissions by pay run for the week view
  const { weeklyData, holdingAreaDocs } = useMemo(() => {
    const allDocs = (allCommissions || []) as (typeof allCommissions extends (infer T)[] | undefined ? T : never)[];
    const byPayRun: Record<string, CommissionRow[]> = {};
    const orphans: CommissionRow[] = [];

    for (const c of allDocs) {
      const row: CommissionRow = {
        id: c.id,
        job_name_id: c.job_name_id,
        sales_rep: c.sales_rep,
        rep_commission: c.rep_commission,
        status: c.status,
        revision_count: (c as any).revision_count ?? 0,
        submitted_at: c.submitted_at,
        created_at: c.created_at,
        rep_name: c.rep_name,
        is_friday_close: (c as any).is_friday_close,
      };
      const prId = (c as any).pay_run_id;
      if (!prId) {
        orphans.push(row);
      } else {
        if (!byPayRun[prId]) byPayRun[prId] = [];
        byPayRun[prId].push(row);
      }
    }

    return { weeklyData: byPayRun, holdingAreaDocs: orphans };
  }, [allCommissions]);

  const currentPeriod = getCurrentPayRunPeriod();
  const currentPayRunId = useMemo(() => {
    return (payRuns || []).find((pr) => pr.period_start === currentPeriod.periodStart)?.id;
  }, [payRuns, currentPeriod]);

  const filteredWeekCommissions = useFilteredCommissions(allCommissions || [], weekFilters);

  const handleApprove = (id: string, newStatus: "manager_approved" | "accounting_approved" | "paid") => {
    approveCommission.mutate({ id, newStatus });
  };

  const handleRejectClick = (id: string, jobName: string, source: "compliance" | "accounting" = "compliance") => {
    setRejectTarget({ id, jobName });
    setRejectReason("");
    setRejectSource(source);
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    rejectCommission.mutate(
      { id: rejectTarget.id, reason: rejectReason.trim(), rejection_source: rejectSource },
      {
        onSuccess: () => {
          setRejectModalOpen(false);
          setRejectTarget(null);
          setRejectReason("");
        },
      }
    );
  };

  const handleImport = () => {
    const rep = allReps?.find((r) => r.id === importData.rep_id);
    if (!rep || !importData.job_name || !importData.job_date || !importData.amount) {
      return;
    }
    importCommission.mutate(
      {
        sales_rep_id: rep.id,
        sales_rep_name: rep.name,
        job_name: importData.job_name,
        job_date: importData.job_date,
        amount: parseFloat(importData.amount),
        mark_as_paid: importData.mark_as_paid,
      },
      {
        onSuccess: () => {
          setImportModalOpen(false);
          setImportData({ rep_id: "", job_name: "", job_date: "", amount: "", mark_as_paid: false });
        },
      }
    );
  };

  const handleExportCSV = () => {
    const headers = ["Rep", "Job", "Date", "Amount", "Status", "Paid Date"];
    const rows = paymentHistory.map((c) => [
      c.rep_name || c.sales_rep,
      c.job_name_id,
      new Date(c.created_at).toLocaleDateString(),
      (c.rep_commission || 0).toFixed(2),
      STATUS_MAP[c.status]?.label || c.status,
      c.paid_at ? new Date(c.paid_at).toLocaleDateString() : "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commissions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = summaryLoading || commissionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="pt-4 lg:pt-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">Commission Manager</h1>
            <p className="text-muted-foreground text-sm">Review and process all rep commissions</p>
          </div>
        </div>
        <PayRunInfoBanner />
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Pending Compliance</span>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary?.pendingCompliance || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Pending Accounting</span>
              <FileCheck className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary?.pendingAccounting || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Pending Payment</span>
              <CheckCircle className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary?.pendingPayment || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Paid This Month</span>
              <Banknote className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(summary?.paidThisMonth || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Form Type Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Type:</span>
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          {[
            { value: "all", label: "All" },
            { value: "standard", label: "Standard" },
            { value: "repair", label: "Repair" },
          ].map((opt) => (
            <Button
              key={opt.value}
              variant={formTypeFilter === opt.value ? "default" : "ghost"}
              size="sm"
              onClick={() => setFormTypeFilter(opt.value)}
              className="text-xs h-7"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50 flex-wrap">
          <TabsTrigger value="weeks" className="gap-2">
            <CalendarRange className="h-3.5 w-3.5" />
            Week View
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            Compliance Queue
            {complianceQueue.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5 text-[11px]">
                {complianceQueue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="accounting" className="gap-2">
            Accounting Queue
            {accountingQueue.length > 0 && (
              <Badge className="ml-1 h-5 min-w-[20px] px-1.5 text-[11px] bg-blue-600">
                {accountingQueue.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
        </TabsList>

        {/* Week View */}
        <TabsContent value="weeks" className="mt-4 space-y-4">
          <CommissionFilterBar
            filters={weekFilters}
            onFilterChange={setWeekFilters}
            reps={allReps}
            payRuns={payRuns}
            showRepFilter
          />
          <PayRunHoldingArea commissions={holdingAreaDocs} />
          {(weekFilters.week !== "all"
            ? (payRuns || []).filter((pr) => pr.id === weekFilters.week)
            : payRuns || []
          ).map((pr) => {
            const prDocs = (weeklyData[pr.id] || []).filter((d) => {
              if (weekFilters.status !== "all") {
                if (weekFilters.status === "revision_required") {
                  if (d.status !== "revision_required" && d.status !== "rejected") return false;
                } else if (d.status !== weekFilters.status) return false;
              }
              if (weekFilters.search.trim()) {
                if (!d.job_name_id?.toLowerCase().includes(weekFilters.search.toLowerCase())) return false;
              }
              return true;
            });
            if (prDocs.length === 0 && weekFilters.status !== "all") return null;
            return (
              <PayRunWeekAccordion
                key={pr.id}
                payRun={pr}
                commissions={prDocs}
                isCurrentWeek={pr.id === currentPayRunId}
                defaultOpen={pr.id === currentPayRunId}
              />
            );
          })}
          {(!payRuns || payRuns.length === 0) && (
            <p className="text-center text-muted-foreground py-12">
              No pay runs found. Commissions will create pay runs automatically when submitted.
            </p>
          )}
        </TabsContent>

        {/* Compliance Queue */}
        <TabsContent value="compliance" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pay run</Label>
              <Select value={queuePayRunFilter} onValueChange={setQueuePayRunFilter}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="All pay runs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pay runs</SelectItem>
                  {(payRuns || []).map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.period_start && pr.period_end
                        ? formatPayRunRange(pr.period_start, pr.period_end)
                        : pr.run_date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep Name</TableHead>
                  <TableHead>Job Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Completed Install</TableHead>
                  <TableHead className="hidden xl:table-cell">Pay Run</TableHead>
                  <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Late</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceQueue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No commissions pending compliance review
                    </TableCell>
                  </TableRow>
                ) : (
                  complianceQueue.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.rep_name}</TableCell>
                      <TableCell
                        className="cursor-pointer hover:underline text-primary"
                        onClick={() => navigate(`/commissions/${c.id}`)}
                      >
                        {c.job_name_id || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {c.install_date || "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground text-xs max-w-[140px] truncate">
                        {c.pay_run_id ? payRunLabelById[c.pay_run_id] || "—" : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                        {c.submitted_at ? formatTimestampMST(c.submitted_at) : new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(c.rep_commission || 0)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <LateBadge isLateSubmission={c.is_late_submission} isLateRevision={c.is_late_revision} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 gap-1"
                            onClick={() => handleApprove(c.id, "manager_approved")}
                            disabled={approveCommission.isPending}
                          >
                            <Check className="w-4 h-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1"
                            onClick={() => handleRejectClick(c.id, c.job_name_id)}
                          >
                            <X className="w-4 h-4" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Accounting Queue */}
        <TabsContent value="accounting" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pay run</Label>
              <Select value={queuePayRunFilter} onValueChange={setQueuePayRunFilter}>
                <SelectTrigger className="w-[260px]">
                  <SelectValue placeholder="All pay runs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pay runs</SelectItem>
                  {(payRuns || []).map((pr) => (
                    <SelectItem key={pr.id} value={pr.id}>
                      {pr.period_start && pr.period_end
                        ? formatPayRunRange(pr.period_start, pr.period_end)
                        : pr.run_date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep Name</TableHead>
                  <TableHead>Job Name</TableHead>
                  <TableHead className="hidden lg:table-cell">Completed Install</TableHead>
                  <TableHead className="hidden xl:table-cell">Pay Run</TableHead>
                  <TableHead className="hidden sm:table-cell">Submitted</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Late</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountingQueue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No commissions pending accounting review
                    </TableCell>
                  </TableRow>
                ) : (
                  accountingQueue.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.rep_name}</TableCell>
                      <TableCell
                        className="cursor-pointer hover:underline text-primary"
                        onClick={() => navigate(`/commissions/${c.id}`)}
                      >
                        {c.job_name_id || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                        {c.install_date || "—"}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-muted-foreground text-xs max-w-[140px] truncate">
                        {c.pay_run_id ? payRunLabelById[c.pay_run_id] || "—" : "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                        {c.submitted_at ? formatTimestampMST(c.submitted_at) : new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(c.rep_commission || 0)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <LateBadge isLateSubmission={c.is_late_submission} isLateRevision={c.is_late_revision} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 gap-1"
                            onClick={() => handleApprove(c.id, "accounting_approved")}
                            disabled={approveCommission.isPending}
                          >
                            <Check className="w-4 h-4" /> Approve for Payment
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1"
                            onClick={() => handleRejectClick(c.id, c.job_name_id, "accounting")}
                          >
                            <X className="w-4 h-4" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Payment History */}
        <TabsContent value="history" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Rep</Label>
              <Select value={historyRepFilter} onValueChange={setHistoryRepFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Reps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reps</SelectItem>
                  {allReps?.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Pending Compliance</SelectItem>
                  <SelectItem value="manager_approved">Compliance Approved</SelectItem>
                  <SelectItem value="accounting_approved">Accounting Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={historyDateFrom}
                onChange={(e) => setHistoryDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={historyDateTo}
                onChange={(e) => setHistoryDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)} className="gap-2">
                <Upload className="w-4 h-4" /> Import
              </Button>
            </div>
          </div>

          {/* History Table */}
          <div className="glass-card rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Paid Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No commissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  paymentHistory.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.rep_name}</TableCell>
                      <TableCell
                        className="cursor-pointer hover:underline text-primary"
                        onClick={() => navigate(`/commission-documents/${c.id}`)}
                      >
                        {c.job_name_id || "—"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(c.rep_commission || 0)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} revisionCount={(c as any).revision_count} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {c.paid_at ? new Date(c.paid_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.status === "accounting_approved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20 gap-1"
                            onClick={() => handleApprove(c.id, "paid")}
                            disabled={approveCommission.isPending}
                          >
                            <Banknote className="w-4 h-4" /> Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

      </Tabs>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Back for Revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Sending commission for <span className="font-medium text-foreground">{rejectTarget?.jobName}</span> back to the rep so they can correct and resubmit.
            </p>
            {!isBeforeRevisionDeadline() && (
              <Alert className="border-amber-500/60 bg-amber-50 dark:bg-amber-950/25">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <AlertTitle className="text-amber-900 dark:text-amber-200">Revision deadline has passed</AlertTitle>
                <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
                  If you reject this commission, it will automatically roll to next week&apos;s pay run. The rep cannot stay in the current pay run for this submission.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Reason for Rejection *</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain what needs to be corrected..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim() || rejectCommission.isPending}
              >
                {rejectCommission.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Send Back
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Historical Commission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Sales Rep *</Label>
              <Select value={importData.rep_id} onValueChange={(v) => setImportData({ ...importData, rep_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a rep" />
                </SelectTrigger>
                <SelectContent>
                  {allReps?.map((rep) => (
                    <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Job Name *</Label>
              <Input
                value={importData.job_name}
                onChange={(e) => setImportData({ ...importData, job_name: e.target.value })}
                placeholder="Enter job name"
              />
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={importData.job_date}
                onChange={(e) => setImportData({ ...importData, job_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={importData.amount}
                onChange={(e) => setImportData({ ...importData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="mark-paid"
                checked={importData.mark_as_paid}
                onCheckedChange={(checked) => setImportData({ ...importData, mark_as_paid: !!checked })}
              />
              <Label htmlFor="mark-paid" className="text-sm">Mark as Paid</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setImportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !importData.rep_id ||
                  !importData.job_name ||
                  !importData.job_date ||
                  !importData.amount ||
                  importCommission.isPending
                }
              >
                {importCommission.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
