import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { formatPayRunRange } from "@/lib/commissionPayDateCalculations";
import type { PayRun } from "@/hooks/usePayRuns";

export interface FilterState {
  status: string;
  rep: string;
  week: string;
  search: string;
  sort: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "revision_required", label: "Rejected / Revision" },
  { value: "manager_approved", label: "Compliance Approved" },
  { value: "accounting_approved", label: "Accounting Approved" },
  { value: "paid", label: "Paid" },
];

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest First" },
  { value: "date_asc", label: "Oldest First" },
  { value: "amount_desc", label: "Amount (High → Low)" },
  { value: "amount_asc", label: "Amount (Low → High)" },
  { value: "rep_asc", label: "Rep Name (A → Z)" },
  { value: "status", label: "Status" },
];

interface CommissionFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  reps?: { id: string; name: string }[];
  payRuns?: PayRun[];
  showRepFilter?: boolean;
}

export function CommissionFilterBar({
  filters,
  onFilterChange,
  reps,
  payRuns,
  showRepFilter = false,
}: CommissionFilterBarProps) {
  const update = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const activeCount = [
    filters.status !== "all" ? 1 : 0,
    filters.rep !== "all" ? 1 : 0,
    filters.week !== "all" ? 1 : 0,
    filters.search ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearAll = () => {
    onFilterChange({ status: "all", rep: "all", week: "all", search: "", sort: "date_desc" });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Status</Label>
        <Select value={filters.status} onValueChange={(v) => update("status", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showRepFilter && reps && reps.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Rep</Label>
          <Select value={filters.rep} onValueChange={(v) => update("rep", v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reps</SelectItem>
              {reps.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {payRuns && payRuns.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Pay Run Week</Label>
          <Select value={filters.week} onValueChange={(v) => update("week", v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {payRuns.map((pr) => (
                <SelectItem key={pr.id} value={pr.id}>
                  {pr.period_start && pr.period_end
                    ? formatPayRunRange(pr.period_start, pr.period_end)
                    : pr.run_date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Sort</Label>
        <Select value={filters.sort} onValueChange={(v) => update("sort", v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Job name..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="pl-9 w-[180px]"
          />
        </div>
      </div>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1 text-muted-foreground">
          <X className="w-3.5 h-3.5" />
          Clear
          <Badge variant="secondary" className="text-[10px] ml-0.5">
            {activeCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}

export function useFilteredCommissions<T extends { status: string; rep_commission: number; created_at: string; sales_rep?: string; rep_name?: string; job_name_id?: string; pay_run_id?: string | null; created_by?: string; sales_rep_id?: string | null }>(
  commissions: T[],
  filters: FilterState
): T[] {
  let result = [...commissions];

  if (filters.status !== "all") {
    if (filters.status === "revision_required") {
      result = result.filter((c) => c.status === "revision_required" || c.status === "rejected");
    } else {
      result = result.filter((c) => c.status === filters.status);
    }
  }

  if (filters.rep !== "all") {
    result = result.filter(
      (c) =>
        (c as any).created_by === filters.rep ||
        (c as any).sales_rep_id === filters.rep
    );
  }

  if (filters.week !== "all") {
    result = result.filter((c) => c.pay_run_id === filters.week);
  }

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter((c) => c.job_name_id?.toLowerCase().includes(q));
  }

  switch (filters.sort) {
    case "date_asc":
      result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
    case "amount_desc":
      result.sort((a, b) => (b.rep_commission || 0) - (a.rep_commission || 0));
      break;
    case "amount_asc":
      result.sort((a, b) => (a.rep_commission || 0) - (b.rep_commission || 0));
      break;
    case "rep_asc":
      result.sort((a, b) => (a.rep_name || a.sales_rep || "").localeCompare(b.rep_name || b.sales_rep || ""));
      break;
    case "status":
      result.sort((a, b) => a.status.localeCompare(b.status));
      break;
    case "date_desc":
    default:
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
  }

  return result;
}
