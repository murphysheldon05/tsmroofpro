import { useNavigate } from "react-router-dom";
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
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommissionRow } from "./PayRunWeekAccordion";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function getHoldingReason(doc: CommissionRow): string {
  if (doc.status === "draft") return "Still in draft — not yet submitted";
  if (doc.status === "revision_required" || doc.status === "rejected")
    return "Awaiting revision from rep";
  return "Not yet assigned to a pay run";
}

interface PayRunHoldingAreaProps {
  commissions: CommissionRow[];
}

export function PayRunHoldingArea({ commissions }: PayRunHoldingAreaProps) {
  const navigate = useNavigate();

  if (commissions.length === 0) return null;

  const totalAmount = commissions.reduce(
    (sum, doc) => sum + (doc.rep_commission || 0),
    0
  );

  return (
    <Card className="mb-6 border-dashed border-2 border-amber-300/60 dark:border-amber-700/60 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span>Pending — Not Yet in a Pay Run</span>
          <Badge variant="secondary" className="text-xs ml-1">
            {commissions.length}
          </Badge>
          <span className="ml-auto text-sm font-mono text-muted-foreground">
            {formatCurrency(totalAmount)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">
          These commissions are not yet assigned to a pay run. They will be
          included once submitted or after deadlines are met.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Job</TableHead>
              <TableHead className="text-xs">Rep</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Reason</TableHead>
              <TableHead className="text-xs text-right">Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissions.map((doc) => (
              <TableRow
                key={doc.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/commission-documents/${doc.id}`)}
              >
                <TableCell className="text-sm font-medium truncate max-w-[180px]">
                  {doc.job_name_id}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {doc.rep_name || doc.sales_rep}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px]",
                      doc.status === "draft"
                        ? "bg-gray-50 text-gray-600 border-gray-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    )}
                  >
                    {doc.status === "draft"
                      ? "Draft"
                      : doc.status === "revision_required"
                        ? "Revision Required"
                        : doc.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 shrink-0" />
                    {getHoldingReason(doc)}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-right font-mono">
                  {formatCurrency(doc.rep_commission)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
