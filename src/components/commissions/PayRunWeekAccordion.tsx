import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatPayRunRange } from "@/lib/commissionPayDateCalculations";
import type { PayRun } from "@/hooks/usePayRuns";

export interface CommissionRow {
  id: string;
  job_name_id: string;
  sales_rep: string;
  rep_commission: number;
  status: string;
  revision_count?: number;
  submitted_at: string | null;
  created_at: string;
  rep_name?: string;
  is_friday_close?: boolean;
  commission_type?: "standard" | "repair";
}

export type StatusBucket =
  | "submitted"
  | "rejected"
  | "resubmitted"
  | "approved"
  | "paid";

export const STATUS_BUCKET_CONFIG: Record<
  StatusBucket,
  { label: string; color: string; bg: string; border: string }
> = {
  submitted: {
    label: "Submitted – Pending Review",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-300 dark:border-amber-700",
  },
  rejected: {
    label: "Rejected – Awaiting Rep Response",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-300 dark:border-red-700",
  },
  resubmitted: {
    label: "Resubmitted – Pending Review",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-300 dark:border-orange-700",
  },
  approved: {
    label: "Approved – Ready to Pay",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-300 dark:border-green-700",
  },
  paid: {
    label: "Paid",
    color: "text-gray-500 dark:text-gray-500",
    bg: "bg-gray-50 dark:bg-gray-900/30",
    border: "border-gray-200 dark:border-gray-800",
  },
};

const BUCKET_ORDER: StatusBucket[] = [
  "submitted",
  "rejected",
  "resubmitted",
  "approved",
  "paid",
];

function classifyCommission(doc: CommissionRow): StatusBucket {
  const { status, revision_count } = doc;
  if (status === "paid") return "paid";
  if (
    status === "manager_approved" ||
    status === "accounting_approved"
  )
    return "approved";
  if (status === "revision_required" || status === "rejected")
    return "rejected";
  if (status === "submitted" && (revision_count ?? 0) > 0)
    return "resubmitted";
  return "submitted";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

interface StatusBucketSectionProps {
  bucket: StatusBucket;
  items: CommissionRow[];
  onRowClick?: (id: string) => void;
}

function StatusBucketSection({ bucket, items, onRowClick }: StatusBucketSectionProps) {
  const config = STATUS_BUCKET_CONFIG[bucket];
  if (items.length === 0) return null;

  return (
    <div className={cn("rounded-lg border mb-3", config.border, config.bg)}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <span className={cn("text-sm font-semibold", config.color)}>
          {config.label}
        </span>
        <Badge variant="secondary" className="text-xs">
          {items.length}
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-t">
            <TableHead className="text-xs">Job</TableHead>
            <TableHead className="text-xs">Rep</TableHead>
            <TableHead className="text-xs text-right">Commission</TableHead>
            <TableHead className="text-xs text-right">Flags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((doc) => (
            <TableRow
              key={doc.id}
              className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors",
                bucket === "paid" && "opacity-50"
              )}
              onClick={() => onRowClick?.(doc.id)}
            >
              <TableCell className="text-sm font-medium truncate max-w-[200px]">
                {doc.job_name_id}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {doc.rep_name || doc.sales_rep}
              </TableCell>
              <TableCell className="text-sm text-right font-mono">
                {formatCurrency(doc.rep_commission)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      doc.commission_type === "repair"
                        ? "bg-violet-50 dark:bg-violet-950/30 text-violet-600 border-violet-200"
                        : "bg-slate-50 dark:bg-slate-900/30 text-slate-500 border-slate-200"
                    )}
                  >
                    {doc.commission_type === "repair" ? "Repair" : "Standard"}
                  </Badge>
                  {doc.is_friday_close && (
                    <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-200">
                      Fri Build
                    </Badge>
                  )}
                  {(doc.revision_count ?? 0) > 0 && bucket !== "rejected" && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 border-amber-200">
                      Revised
                    </Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface PayRunWeekAccordionProps {
  payRun: PayRun;
  commissions: CommissionRow[];
  isCurrentWeek?: boolean;
  defaultOpen?: boolean;
}

export function PayRunWeekAccordion({
  payRun,
  commissions,
  isCurrentWeek = false,
  defaultOpen = false,
}: PayRunWeekAccordionProps) {
  const navigate = useNavigate();

  const buckets = useMemo(() => {
    const grouped: Record<StatusBucket, CommissionRow[]> = {
      submitted: [],
      rejected: [],
      resubmitted: [],
      approved: [],
      paid: [],
    };
    for (const doc of commissions) {
      grouped[classifyCommission(doc)].push(doc);
    }
    return grouped;
  }, [commissions]);

  const totalAmount = commissions.reduce(
    (sum, doc) => sum + (doc.rep_commission || 0),
    0
  );

  const counts = BUCKET_ORDER.map((b) => ({
    bucket: b,
    count: buckets[b].length,
  })).filter((c) => c.count > 0);

  const handleRowClick = (id: string) => {
    navigate(`/commission-documents/${id}`);
  };

  const rangeLabel = formatPayRunRange(payRun.period_start, payRun.period_end);

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? payRun.id : undefined}
    >
      <AccordionItem
        value={payRun.id}
        className={cn(
          "rounded-xl border mb-4 overflow-hidden",
          isCurrentWeek
            ? "border-primary/40 ring-1 ring-primary/20 bg-primary/[0.02]"
            : "border-border"
        )}
      >
        <AccordionTrigger className="px-5 py-4 hover:no-underline">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full text-left mr-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">
                Pay Run: {rangeLabel}
              </span>
              {isCurrentWeek && (
                <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                  Current Week
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
              {counts.map(({ bucket, count }) => {
                const cfg = STATUS_BUCKET_CONFIG[bucket];
                return (
                  <Badge
                    key={bucket}
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      cfg.bg,
                      cfg.color,
                      cfg.border
                    )}
                  >
                    {count} {bucket === "paid" ? "Paid" : bucket.charAt(0).toUpperCase() + bucket.slice(1)}
                  </Badge>
                );
              })}
              <span className="text-sm font-mono text-muted-foreground ml-2">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-5 pb-4">
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No commissions in this pay run.
            </p>
          ) : (
            BUCKET_ORDER.map((bucket) => (
              <StatusBucketSection
                key={bucket}
                bucket={bucket}
                items={buckets[bucket]}
                onRowClick={handleRowClick}
              />
            ))
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
