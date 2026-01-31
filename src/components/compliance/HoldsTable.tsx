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
import { MoreHorizontal, Eye, Unlock, DollarSign, FileText, Calendar, UserX } from "lucide-react";
import { format } from "date-fns";

interface Hold {
  id: string;
  created_at: string;
  hold_type: string;
  job_id: string | null;
  user_id: string | null;
  reason: string;
  status: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
}

type HoldAction = "view" | "release";

interface HoldsTableProps {
  holds: Hold[] | undefined;
  isLoading: boolean;
  onAction: (holdId: string, action: HoldAction, hold: Hold) => void;
}

const holdTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  commission_hold: { label: "Commission", icon: DollarSign, color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  invoice_hold: { label: "Invoice", icon: FileText, color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  scheduling_hold: { label: "Scheduling", icon: Calendar, color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
  access_hold: { label: "Access", icon: UserX, color: "bg-red-500/15 text-red-600 border-red-500/30" },
  violation_hold: { label: "Violation", icon: FileText, color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
};

const statusColors: Record<string, string> = {
  active: "bg-red-500/15 text-red-600 border-red-500/30",
  released: "bg-green-500/15 text-green-600 border-green-500/30",
};

export function HoldsTable({ holds, isLoading, onAction }: HoldsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!holds || holds.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No holds found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Created</TableHead>
            <TableHead className="w-[130px]">Hold Type</TableHead>
            <TableHead className="w-[120px]">Job ID / User</TableHead>
            <TableHead className="min-w-[200px]">Reason</TableHead>
            <TableHead className="w-[90px]">Status</TableHead>
            <TableHead className="w-[80px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holds.map((h) => {
            const config = holdTypeConfig[h.hold_type] || { 
              label: h.hold_type, 
              icon: FileText, 
              color: "bg-muted text-muted-foreground" 
            };
            const Icon = config.icon;
            const isActive = h.status === "active";
            
            return (
              <TableRow key={h.id}>
                <TableCell className="text-xs">
                  <div className="space-y-0.5">
                    <div>{format(new Date(h.created_at), "MMM d, yyyy")}</div>
                    <div className="text-muted-foreground">
                      {format(new Date(h.created_at), "h:mm a")}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={config.color}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {h.job_id ? (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-primary"
                      onClick={() => window.open(`https://acculynx.com/jobs/${h.job_id}`, "_blank")}
                    >
                      {h.job_id}
                    </Button>
                  ) : h.user_id ? (
                    <span className="text-muted-foreground text-xs">User: {h.user_id.slice(0, 8)}...</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="text-sm line-clamp-2 cursor-help">
                          {h.reason}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-sm">{h.reason}</p>
                        {h.related_entity_type && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Related: {h.related_entity_type} {h.related_entity_id && `(${h.related_entity_id})`}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[h.status || "active"] || ""}>
                    {h.status || "active"}
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
                      <DropdownMenuItem onClick={() => onAction(h.id, "view", h)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {isActive && (
                        <DropdownMenuItem onClick={() => onAction(h.id, "release", h)}>
                          <Unlock className="w-4 h-4 mr-2" />
                          Release Hold
                        </DropdownMenuItem>
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
