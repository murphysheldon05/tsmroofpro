import { useState, useMemo } from "react";
import { useAccountingCommissions, useMarkCommissionsPaid } from "@/hooks/useAccountingCommissions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Download, CheckCircle, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { calculateScheduledPayDate, formatPayDateShort } from "@/lib/commissionPayDateCalculations";

interface Props {
  mode: "pending" | "history";
}

export function AccountingPayoutQueue({ mode }: Props) {
  const { data: commissions, isLoading } = useAccountingCommissions();
  const markPaid = useMarkCommissionsPaid();
  const [selected, setSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    let items = commissions || [];
    
    if (mode === "pending") {
      items = items.filter((c) => c.status === "approved" || c.status === "accounting_approved");
    } else {
      items = items.filter((c) => c.status === "paid");
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (c) =>
          c.job_name_id.toLowerCase().includes(q) ||
          c.sales_rep.toLowerCase().includes(q)
      );
    }

    return items;
  }, [commissions, mode, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((c) => c.id));
    }
  };

  const handleBatchPay = () => {
    if (selected.length === 0) return;
    markPaid.mutate(selected, {
      onSuccess: () => setSelected([]),
    });
  };

  const handleExportCSV = () => {
    if (!filtered.length) return;
    const headers = ["Job", "Sales Rep", "Commission", "Status", "Date"];
    const rows = filtered.map((c) => [
      c.job_name_id,
      c.sales_rep,
      `$${(c.rep_commission || 0).toFixed(2)}`,
      c.status,
      c.paid_at ? format(new Date(c.paid_at), "MM/dd/yyyy") : format(new Date(c.created_at), "MM/dd/yyyy"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payout-${mode}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalSelected = useMemo(
    () => filtered.filter((c) => selected.includes(c.id)).reduce((sum, c) => sum + (c.rep_commission || 0), 0),
    [filtered, selected]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-card/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <Card className="bg-card/60 border-border/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg">
            {mode === "pending" ? "Approved — Ready to Pay" : "Payout History"}
          </CardTitle>
          <div className="flex gap-2">
            {mode === "pending" && selected.length > 0 && (
              <Button
                onClick={handleBatchPay}
                disabled={markPaid.isPending}
                className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle className="h-4 w-4" />
                Mark {selected.length} Paid {totalSelected > 0 && `($${totalSelected.toFixed(2)})`}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 rounded-xl">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by job or rep name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl bg-background/60 border-border/40 h-10"
          />
        </div>

        {/* Select All */}
        {mode === "pending" && filtered.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={selected.length === filtered.length && filtered.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-xs text-muted-foreground">
              Select All ({filtered.length})
            </span>
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {mode === "pending" ? "No approved commissions awaiting payment" : "No payout history yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((commission) => {
              const payDate = commission.approved_at
                ? calculateScheduledPayDate(new Date(commission.approved_at))
                : null;

              return (
                <div
                  key={commission.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-background/40 hover:bg-background/60 transition-colors"
                >
                  {mode === "pending" && (
                    <Checkbox
                      checked={selected.includes(commission.id)}
                      onCheckedChange={() => toggleSelect(commission.id)}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{commission.job_name_id}</span>
                      <Badge variant={commission.status === "paid" ? "default" : "secondary"} className="text-xs">
                        {commission.status === "paid" ? "Paid" : "Approved"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>{commission.sales_rep}</span>
                      {(commission as any).manager_approved_by_profile?.full_name && (
                        <span className="text-primary/70">
                          Approved by: {(commission as any).manager_approved_by_profile.full_name}
                        </span>
                      )}
                      {commission.manager_approved_at && (
                        <span>on {format(new Date(commission.manager_approved_at), "MMM d, yyyy")}</span>
                      )}
                      {payDate && mode === "pending" && (
                        <span>• Pay by: {formatPayDateShort(payDate)}</span>
                      )}
                      {commission.paid_at && mode === "history" && (
                        <span>Paid: {format(new Date(commission.paid_at), "MMM d, yyyy")}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold">
                      ${(commission.rep_commission || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
