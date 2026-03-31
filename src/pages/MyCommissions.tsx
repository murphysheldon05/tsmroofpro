import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCommissionDocuments, type CommissionDocument } from "@/hooks/useCommissionDocuments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Plus,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle,
  FileCheck,
  Banknote,
  Loader2,
} from "lucide-react";
import { LateBadge } from "@/components/commissions/LateBadge";
import { formatTimestampMST } from "@/lib/commissionPayDateCalculations";

type StatusFilter = "submitted" | "manager_approved" | "accounting_approved" | "paid" | null;
type TimeFilter = "week" | "month" | "year" | "all";

const STATUS_MAP: Record<string, { label: string; color: string; bgClass: string }> = {
  submitted: { label: "Pending Compliance Review", color: "text-yellow-700 dark:text-yellow-400", bgClass: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700" },
  manager_approved: { label: "Compliance Approved", color: "text-blue-700 dark:text-blue-400", bgClass: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700" },
  accounting_approved: { label: "Accounting Approved", color: "text-purple-700 dark:text-purple-400", bgClass: "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700" },
  paid: { label: "Paid", color: "text-green-700 dark:text-green-400", bgClass: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700" },
  rejected: { label: "Denied", color: "text-red-900 dark:text-red-300", bgClass: "bg-red-200 dark:bg-red-950/40 border-red-400 dark:border-red-800" },
  revision_required: { label: "Revision Required", color: "text-amber-700 dark:text-amber-400", bgClass: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700" },
  draft: { label: "Draft", color: "text-gray-700 dark:text-gray-400", bgClass: "bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700" },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function StatusBadge({ status, revisionCount }: { status: string; revisionCount?: number }) {
  const info = STATUS_MAP[status] || STATUS_MAP.draft;
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

function getStartOfPeriod(filter: TimeFilter): Date | null {
  const now = new Date();
  switch (filter) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    case "all":
      return null;
  }
}

export default function MyCommissions() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: commissions, isLoading } = useCommissionDocuments();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect admins to commission manager
  if (isAdmin) {
    navigate("/commission-manager", { replace: true });
    return null;
  }

  const activeCommissions = useMemo(
    () => (commissions || []).filter((c) => c.status !== "draft"),
    [commissions]
  );

  const summaryCards = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const submitted = activeCommissions
      .filter((c) => c.status === "submitted")
      .reduce((sum, c) => sum + (c.rep_commission || 0), 0);

    const complianceApproved = activeCommissions
      .filter((c) => c.status === "manager_approved")
      .reduce((sum, c) => sum + (c.rep_commission || 0), 0);

    const accountingApproved = activeCommissions
      .filter((c) => c.status === "accounting_approved")
      .reduce((sum, c) => sum + (c.rep_commission || 0), 0);

    const paidThisPeriod = activeCommissions
      .filter((c) => c.status === "paid" && c.paid_at && new Date(c.paid_at) >= startOfMonth)
      .reduce((sum, c) => sum + (c.rep_commission || 0), 0);

    return [
      { title: "Total Submitted", amount: submitted, filterKey: "submitted" as StatusFilter, icon: Clock, iconColor: "text-yellow-500" },
      { title: "Compliance Approved", amount: complianceApproved, filterKey: "manager_approved" as StatusFilter, icon: FileCheck, iconColor: "text-blue-500" },
      { title: "Accounting Approved", amount: accountingApproved, filterKey: "accounting_approved" as StatusFilter, icon: CheckCircle, iconColor: "text-purple-500" },
      { title: "Paid This Month", amount: paidThisPeriod, filterKey: "paid" as StatusFilter, icon: Banknote, iconColor: "text-green-500" },
    ];
  }, [activeCommissions]);

  const filteredCommissions = useMemo(() => {
    let filtered = activeCommissions;

    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    const startOfPeriod = getStartOfPeriod(timeFilter);
    if (startOfPeriod) {
      filtered = filtered.filter((c) => new Date(c.created_at) >= startOfPeriod);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => c.job_name_id?.toLowerCase().includes(q));
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [activeCommissions, statusFilter, timeFilter, searchQuery]);

  const handleCardClick = (filterKey: StatusFilter) => {
    setStatusFilter((prev) => (prev === filterKey ? null : filterKey));
  };

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
      <header className="pt-4 lg:pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Commissions</h1>
            <p className="text-muted-foreground text-sm">Track and manage your earnings</p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/commission-documents/new")}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Submit Commission
        </Button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card
            key={card.title}
            className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
              statusFilter === card.filterKey
                ? "ring-2 ring-primary shadow-md"
                : "hover:ring-1 hover:ring-primary/30"
            }`}
            onClick={() => handleCardClick(card.filterKey)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(card.amount)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {statusFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStatusFilter(null)}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Clear Filter
          </Button>
        )}
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          {(["week", "month", "year", "all"] as TimeFilter[]).map((tf) => (
            <Button
              key={tf}
              variant={timeFilter === tf ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimeFilter(tf)}
              className="text-xs"
            >
              {tf === "week" ? "This Week" : tf === "month" ? "This Month" : tf === "year" ? "This Year" : "All Time"}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by job name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Commission Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job Name</TableHead>
              <TableHead className="hidden sm:table-cell">Submitted</TableHead>
              <TableHead className="hidden md:table-cell">Completed Install</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Late</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCommissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {statusFilter
                    ? "No commissions found with this status"
                    : "No commissions submitted yet. Click \"Submit Commission\" to get started."}
                </TableCell>
              </TableRow>
            ) : (
              filteredCommissions.map((commission) => (
                <TableRow
                  key={commission.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/commission-documents/${commission.id}`)}
                >
                  <TableCell className="font-medium">{commission.job_name_id || "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                    {commission.submitted_at
                      ? formatTimestampMST(commission.submitted_at)
                      : new Date(commission.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {commission.install_date || "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(commission.rep_commission || 0)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={commission.status} revisionCount={commission.revision_count} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <LateBadge isLateSubmission={commission.is_late_submission} isLateRevision={commission.is_late_revision} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
