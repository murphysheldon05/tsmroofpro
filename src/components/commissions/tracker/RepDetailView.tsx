import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { PayTypeBadge } from "./PayTypeBadge";
import { formatUSD, getRepInitials, type EnrichedEntry } from "@/hooks/useCommissionEntries";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface RepDetailViewProps {
  repName: string;
  repColor: string;
  entries: EnrichedEntry[];
  readOnly?: boolean;
  hideBackButton?: boolean;
}

export function RepDetailView({ repName, repColor, entries, readOnly, hideBackButton }: RepDetailViewProps) {
  const navigate = useNavigate();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const isPrestonStuart = repName.toUpperCase().includes("PRESTON STUART");

  const ytdPaid = entries.reduce((s, e) => s + e.amount_paid, 0);
  const jobCommissions = entries.filter((e) => e.pay_type_name === "Commission");
  const jobCount = jobCommissions.length;
  const totalJobValue = entries.filter((e) => e.job_value).reduce((s, e) => s + (e.job_value || 0), 0);
  const avgCommPct = totalJobValue > 0 ? (ytdPaid / totalJobValue) * 100 : 0;
  const drawsAdvances = entries.filter((e) => e.pay_type_name !== "Commission").reduce((s, e) => s + e.amount_paid, 0);

  const drawsTaken = isPrestonStuart ? entries.filter((e) => (e.applied_bank || 0) < 0).reduce((s, e) => s + Math.abs(e.applied_bank || 0), 0) : 0;
  const drawPaybacks = isPrestonStuart ? entries.filter((e) => (e.applied_bank || 0) > 0).reduce((s, e) => s + (e.applied_bank || 0), 0) : 0;
  const drawBalance = isPrestonStuart ? drawsTaken - drawPaybacks : 0;

  const grouped = useMemo(() => {
    const dateMap = new Map<string, EnrichedEntry[]>();
    entries.forEach((e) => {
      if (!dateMap.has(e.paid_date)) dateMap.set(e.paid_date, []);
      dateMap.get(e.paid_date)!.push(e);
    });
    return Array.from(dateMap.entries())
      .map(([date, items]) => ({ date, items }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date); else next.add(date);
      return next;
    });
  };

  const copyShareLink = () => {
    const slug = repName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    navigator.clipboard.writeText(`${window.location.origin}/commission-tracker/${slug}#share`);
    toast.success("Share link copied to clipboard");
    setShowShareModal(false);
  };

  const statCards = [
    { label: "YTD Paid", value: formatUSD(ytdPaid), color: "border-t-emerald-500" },
    { label: "Job Commissions", value: formatUSD(jobCommissions.reduce((s, e) => s + e.amount_paid, 0)), sub: `${jobCount} jobs`, color: "border-t-blue-500" },
    { label: "Draws & Advances", value: formatUSD(drawsAdvances), color: "border-t-amber-500" },
    { label: "Total Job Value", value: formatUSD(totalJobValue), sub: `avg ${avgCommPct.toFixed(1)}%`, color: "border-t-purple-500" },
  ];

  if (isPrestonStuart) {
    statCards.push(
      { label: "Draws Taken", value: formatUSD(drawsTaken), color: "border-t-red-500" },
      { label: "Draw Paybacks", value: formatUSD(drawPaybacks), color: "border-t-green-500" },
      { label: "Draw Balance", value: formatUSD(drawBalance), sub: drawBalance > 0 ? "Owed" : "Paid Off", color: drawBalance > 0 ? "border-t-red-500" : "border-t-green-500" },
    );
  }

  const totalJobVal = entries.filter((e) => e.job_value).reduce((s, e) => s + (e.job_value || 0), 0);
  const totalPaid = entries.reduce((s, e) => s + e.amount_paid, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {!hideBackButton && (
          <Button variant="ghost" size="icon" onClick={() => navigate("/commission-tracker")} className="rounded-xl">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-12 w-12">
          <AvatarFallback style={{ backgroundColor: repColor }} className="text-white text-lg font-bold">
            {getRepInitials(repName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">{repName}</h1>
          <p className="text-sm text-muted-foreground">{entries.length} transactions</p>
        </div>
        {!readOnly && (
          <Button variant="outline" className="gap-2 rounded-xl" onClick={() => setShowShareModal(true)}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
        )}
      </div>

      {readOnly && (
        <div className="bg-muted/50 border border-border rounded-xl px-4 py-2 text-sm text-muted-foreground">📋 Read-only view</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((c) => (
          <Card key={c.label} className={`border-t-4 ${c.color}`}>
            <CardContent className="p-3">
              <div className="text-xs text-muted-foreground font-medium mb-1">{c.label}</div>
              <div className="text-lg font-extrabold">{c.value}</div>
              {c.sub && <div className="text-[10px] text-muted-foreground">{c.sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-8" />
              <TableHead>Pay Date</TableHead>
              <TableHead>Job #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Job Value</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              {isPrestonStuart && (
                <>
                  <TableHead className="text-right">Earned Comm</TableHead>
                  <TableHead className="text-right">Applied to Bank</TableHead>
                </>
              )}
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.map(({ date, items }, gi) => {
              const isMulti = items.length > 1;
              const isExpanded = expandedDates.has(date);
              const dateJobValue = items.filter((e) => e.job_value).reduce((s, e) => s + (e.job_value || 0), 0);
              const datePaid = items.reduce((s, e) => s + e.amount_paid, 0);
              const bandClass = gi % 2 === 0 ? "" : "bg-blue-50/30 dark:bg-blue-900/5";

              if (isMulti) {
                return (
                  <>{/* Summary row */}
                    <TableRow key={`summary-${date}`} className={cn("cursor-pointer hover:bg-muted/20 font-medium", bandClass)} onClick={() => toggleDate(date)}>
                      <TableCell className="w-8 text-center"><ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} /></TableCell>
                      <TableCell className="font-semibold">{format(parseISO(date), "MM/dd/yyyy")}</TableCell>
                      <TableCell colSpan={3} className="text-muted-foreground text-sm">{items.length} items on this pay run</TableCell>
                      <TableCell className="text-right font-mono">{formatUSD(dateJobValue)}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatUSD(datePaid)}</TableCell>
                      {isPrestonStuart && <><TableCell /><TableCell /></>}
                      <TableCell />
                    </TableRow>
                    {isExpanded && items.map((entry) => (
                      <TableRow key={entry.id} className={cn("bg-muted/10", bandClass)}>
                        <TableCell />
                        <TableCell className="text-sm pl-8">{format(parseISO(entry.paid_date), "MM/dd/yyyy")}</TableCell>
                        <TableCell className="text-sm font-mono">{entry.job || "—"}</TableCell>
                        <TableCell className="text-sm">{entry.customer || "—"}</TableCell>
                        <TableCell><PayTypeBadge entryId={entry.id} currentPayType={entry.pay_type} repName={repName} readOnly={readOnly} /></TableCell>
                        <TableCell className="text-right text-sm font-mono">{formatUSD(entry.job_value)}</TableCell>
                        <TableCell className={cn("text-right text-sm font-mono", !entry.has_paid && "text-muted-foreground")}>{entry.has_paid ? formatUSD(entry.amount_paid) : "—"}</TableCell>
                        {isPrestonStuart && (
                          <>
                            <TableCell className="text-right text-sm font-mono">{formatUSD(entry.earned_comm)}</TableCell>
                            <TableCell className={cn("text-right text-sm font-mono", (entry.applied_bank || 0) < 0 ? "text-red-600" : (entry.applied_bank || 0) > 0 ? "text-green-600" : "")}>
                              {entry.applied_bank != null ? entry.applied_bank < 0 ? `(${formatUSD(Math.abs(entry.applied_bank))})` : formatUSD(entry.applied_bank) : "—"}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{entry.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              }

              const entry = items[0];
              return (
                <TableRow key={entry.id} className={cn("hover:bg-muted/20", bandClass)}>
                  <TableCell />
                  <TableCell className="text-sm">{format(parseISO(entry.paid_date), "MM/dd/yyyy")}</TableCell>
                  <TableCell className="text-sm font-mono">{entry.job || "—"}</TableCell>
                  <TableCell className="text-sm">{entry.customer || "—"}</TableCell>
                  <TableCell><PayTypeBadge entryId={entry.id} currentPayType={entry.pay_type} repName={repName} readOnly={readOnly} /></TableCell>
                  <TableCell className="text-right text-sm font-mono">{formatUSD(entry.job_value)}</TableCell>
                  <TableCell className={cn("text-right text-sm font-mono", !entry.has_paid && "text-muted-foreground")}>{entry.has_paid ? formatUSD(entry.amount_paid) : "—"}</TableCell>
                  {isPrestonStuart && (
                    <>
                      <TableCell className="text-right text-sm font-mono">{formatUSD(entry.earned_comm)}</TableCell>
                      <TableCell className={cn("text-right text-sm font-mono", (entry.applied_bank || 0) < 0 ? "text-red-600" : (entry.applied_bank || 0) > 0 ? "text-green-600" : "")}>
                        {entry.applied_bank != null ? entry.applied_bank < 0 ? `(${formatUSD(Math.abs(entry.applied_bank))})` : formatUSD(entry.applied_bank) : "—"}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{entry.notes || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-[#111827] text-white font-bold">
              <TableCell />
              <TableCell>TOTAL</TableCell>
              <TableCell colSpan={3} />
              <TableCell className="text-right font-mono">{formatUSD(totalJobVal)}</TableCell>
              <TableCell className="text-right font-mono">{formatUSD(totalPaid)}</TableCell>
              {isPrestonStuart && <><TableCell /><TableCell /></>}
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share {repName}'s Commission Report</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Anyone with this link can view a read-only version of this rep's commission data.</p>
          <Button onClick={copyShareLink} className="w-full rounded-xl">Copy Share Link</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
