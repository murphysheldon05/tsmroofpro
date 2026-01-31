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
import { MoreHorizontal, Eye, Ban, TrendingUp, CheckCircle, Unlock, ThumbsUp, ThumbsDown } from "lucide-react";
import { format } from "date-fns";

interface Violation {
  id: string;
  created_at: string;
  severity: string;
  sop_key: string;
  department: string | null;
  job_id: string | null;
  description: string;
  status: string | null;
  violation_type: string;
}

type ViolationAction = "view" | "apply_hold" | "escalate" | "resolve" | "release_hold" | "approve" | "deny";

interface ViolationsTableProps {
  violations: Violation[] | undefined;
  isLoading: boolean;
  isAdmin: boolean;
  onAction: (violationId: string, action: ViolationAction) => void;
}

const severityColors: Record<string, string> = {
  minor: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  major: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  severe: "bg-red-500/15 text-red-600 border-red-500/30",
};

const statusColors: Record<string, string> = {
  open: "bg-red-500/15 text-red-600 border-red-500/30",
  blocked: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  escalated: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  resolved: "bg-green-500/15 text-green-600 border-green-500/30",
};

function getActionsForStatus(status: string | null, isAdmin: boolean): { action: ViolationAction; label: string; icon: React.ElementType }[] {
  const normalizedStatus = status || "open";
  
  switch (normalizedStatus) {
    case "open":
      return [
        { action: "view", label: "View", icon: Eye },
        { action: "apply_hold", label: "Apply Hold", icon: Ban },
        { action: "escalate", label: "Escalate", icon: TrendingUp },
        { action: "resolve", label: "Resolve", icon: CheckCircle },
      ];
    case "blocked":
      return [
        { action: "view", label: "View", icon: Eye },
        { action: "release_hold", label: "Release Hold", icon: Unlock },
        { action: "escalate", label: "Escalate", icon: TrendingUp },
        { action: "resolve", label: "Resolve", icon: CheckCircle },
      ];
    case "escalated":
      if (isAdmin) {
        return [
          { action: "view", label: "View", icon: Eye },
          { action: "approve", label: "Approve", icon: ThumbsUp },
          { action: "deny", label: "Deny", icon: ThumbsDown },
        ];
      }
      return [{ action: "view", label: "View", icon: Eye }];
    case "resolved":
      return [{ action: "view", label: "View", icon: Eye }];
    default:
      return [{ action: "view", label: "View", icon: Eye }];
  }
}

export function ViolationsTable({ violations, isLoading, isAdmin, onAction }: ViolationsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!violations || violations.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No violations found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Created</TableHead>
            <TableHead className="w-[80px]">Severity</TableHead>
            <TableHead className="w-[70px]">SOP</TableHead>
            <TableHead className="w-[100px] hidden md:table-cell">Department</TableHead>
            <TableHead className="w-[100px] hidden sm:table-cell">Job ID</TableHead>
            <TableHead className="min-w-[200px]">Description</TableHead>
            <TableHead className="w-[90px]">Status</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {violations.map((v) => {
            const actions = getActionsForStatus(v.status, isAdmin);
            
            return (
              <TableRow key={v.id}>
                <TableCell className="text-xs">
                  <div className="space-y-0.5">
                    <div>{format(new Date(v.created_at), "MMM d, yyyy")}</div>
                    <div className="text-muted-foreground">
                      {format(new Date(v.created_at), "h:mm a")}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={severityColors[v.severity] || ""}>
                    {v.severity}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {v.sop_key}
                </TableCell>
                <TableCell className="hidden md:table-cell capitalize text-sm">
                  {v.department || "—"}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {v.job_id ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      onClick={() => window.open(`https://acculynx.com/jobs/${v.job_id}`, "_blank")}
                    >
                      {v.job_id}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm line-clamp-2 cursor-help">
                          {v.description}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">{v.description}</p>
                        {v.violation_type && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Type: {v.violation_type}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[v.status || "open"] || ""}>
                    {v.status || "open"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {actions.map(({ action, label, icon: Icon }) => (
                        <DropdownMenuItem
                          key={action}
                          onClick={() => onAction(v.id, action)}
                        >
                          <Icon className="w-4 h-4 mr-2" />
                          {label}
                        </DropdownMenuItem>
                      ))}
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
