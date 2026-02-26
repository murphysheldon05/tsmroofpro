import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PayTypeBadge } from "./PayTypeBadge";
import { getRepInitials, slugifyRep, type EnrichedEntry, type CommissionRep, type CommissionPayType, type CommissionPayRun } from "@/hooks/useCommissionEntries";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface AllTransactionsTableProps {
  entries: EnrichedEntry[];
  reps: CommissionRep[];
  payTypes: CommissionPayType[];
  payRuns?: CommissionPayRun[];
  readOnly?: boolean;
}

export function AllTransactionsTable({ entries, reps, payTypes, payRuns, readOnly }: AllTransactionsTableProps) {
  const navigate = useNavigate();
  const [repFilter, setRepFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [runFilter, setRunFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = entries;
    if (repFilter !== "all") result = result.filter((e) => e.rep_id === repFilter);
    if (typeFilter !== "all") result = result.filter((e) => e.pay_type_id === typeFilter);
    if (runFilter === "unassigned") result = result.filter((e) => !e.pay_run_id);
    else if (runFilter !== "all") result = result.filter((e) => e.pay_run_id === runFilter);
    return result;
  }, [entries, repFilter, typeFilter, runFilter]);

  const totalAmount = filtered.reduce((s, e) => s + e.amount_paid, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <SelectValue placeholder="All Reps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reps</SelectItem>
            {reps.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px] rounded-xl">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {payTypes.map((pt) => <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {payRuns && payRuns.length > 0 && (
          <Select value={runFilter} onValueChange={setRunFilter}>
            <SelectTrigger className="w-[200px] rounded-xl">
              <SelectValue placeholder="All Pay Runs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Pay Runs</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {payRuns.map((pr) => (
                <SelectItem key={pr.id} value={pr.id}>
                  {format(parseISO(pr.run_date), "MM/dd/yyyy")} ({pr.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="text-sm text-muted-foreground ml-auto">
          {filtered.length} transactions · {formatCurrency(totalAmount)}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Rep</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Job #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Job Value</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors">
                <TableCell>
                  <button
                    onClick={() => navigate(`/commission-tracker/${slugifyRep(entry.rep_name)}`)}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback style={{ backgroundColor: entry.rep_color }} className="text-white text-[10px] font-bold">
                        {getRepInitials(entry.rep_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium whitespace-nowrap">{entry.rep_name}</span>
                  </button>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">{format(parseISO(entry.paid_date), "MM/dd/yyyy")}</TableCell>
                <TableCell className="text-sm font-mono">{entry.job || "—"}</TableCell>
                <TableCell className="text-sm">{entry.customer || "—"}</TableCell>
                <TableCell>
                  <PayTypeBadge entryId={entry.id} currentPayType={entry.pay_type} repName={entry.rep_name} readOnly={readOnly} />
                </TableCell>
                <TableCell className="text-right text-sm font-mono">{formatCurrency(entry.job_value)}</TableCell>
                <TableCell className="text-right text-sm font-mono font-semibold">{formatCurrency(entry.amount_paid)}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{entry.notes || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-[#111827] text-white font-bold">
              <TableCell colSpan={5}>TOTAL</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(filtered.filter((e) => e.job_value).reduce((s, e) => s + (e.job_value || 0), 0))}
              </TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(totalAmount)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
