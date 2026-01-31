import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MoreHorizontal, Eye, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface Escalation {
  id: string;
  created_at: string;
  violation_id: string;
  escalated_by_user_id: string | null;
  reason: string | null;
  status: string | null;
  final_decision_notes: string | null;
  decided_at: string | null;
  decided_by_user_id: string | null;
  compliance_violations?: {
    id: string;
    sop_key: string;
    description: string;
    severity: string;
    status: string | null;
  } | null;
  escalated_by_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

type EscalationAction = "view" | "approve" | "deny";

interface EscalationsTableProps {
  escalations: Escalation[] | undefined;
  isLoading: boolean;
  isAdmin: boolean;
  onAction: (escalation: Escalation, action: EscalationAction) => void;
  onViewViolation: (violationId: string) => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  approved: "bg-green-500/15 text-green-600 border-green-500/30",
  denied: "bg-red-500/15 text-red-600 border-red-500/30",
  closed: "bg-gray-500/15 text-gray-600 border-gray-500/30",
};

const severityColors: Record<string, string> = {
  minor: "text-yellow-600",
  major: "text-orange-600",
  severe: "text-red-600",
};

export function EscalationsTable({ 
  escalations, 
  isLoading, 
  isAdmin,
  onAction,
  onViewViolation,
}: EscalationsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!escalations || escalations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No escalations found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Created</TableHead>
            <TableHead className="w-[150px]">Violation</TableHead>
            <TableHead className="w-[130px] hidden md:table-cell">Escalated By</TableHead>
            <TableHead className="min-w-[180px]">Reason</TableHead>
            <TableHead className="w-[90px]">Status</TableHead>
            <TableHead className="w-[150px] hidden lg:table-cell">Decision Notes</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {escalations.map((e) => {
            const isPending = e.status === "pending";
            const violation = e.compliance_violations;
            
            return (
              <TableRow key={e.id}>
                <TableCell className="text-xs">
                  <div className="space-y-0.5">
                    <div>{format(new Date(e.created_at), "MMM d, yyyy")}</div>
                    <div className="text-muted-foreground">
                      {format(new Date(e.created_at), "h:mm a")}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {violation ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-left flex items-start gap-1"
                      onClick={() => onViewViolation(violation.id)}
                    >
                      <span className="flex flex-col">
                        <span className={`font-mono text-xs ${severityColors[violation.severity] || ""}`}>
                          {violation.sop_key}
                        </span>
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {violation.description.slice(0, 30)}...
                        </span>
                      </span>
                      <ExternalLink className="w-3 h-3 mt-0.5 shrink-0" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm">
                  {e.escalated_by_profile?.full_name || e.escalated_by_profile?.email || "Unknown"}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm line-clamp-2 cursor-help">
                          {e.reason || "No reason provided"}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">{e.reason || "No reason provided"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[e.status || "pending"] || ""}>
                    {e.status || "pending"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {e.final_decision_notes ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="line-clamp-2 cursor-help">
                            {e.final_decision_notes}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <p className="text-sm">{e.final_decision_notes}</p>
                          {e.decided_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Decided: {format(new Date(e.decided_at), "MMM d, yyyy")}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span>—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onAction(e, "view")}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {isPending && isAdmin && (
                        <>
                          <DropdownMenuItem onClick={() => onAction(e, "approve")}>
                            <ThumbsUp className="w-4 h-4 mr-2 text-green-600" />
                            Approve
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction(e, "deny")}>
                            <ThumbsDown className="w-4 h-4 mr-2 text-red-600" />
                            Deny
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
