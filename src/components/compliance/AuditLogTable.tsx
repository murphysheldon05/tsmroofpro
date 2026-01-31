import { useState } from "react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface AuditLogEntry {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Json | null;
  actor_profile?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface AuditLogTableProps {
  entries: AuditLogEntry[] | undefined;
  isLoading: boolean;
  onTargetClick: (targetType: string, targetId: string) => void;
}

const actionColors: Record<string, string> = {
  create_violation: "bg-red-500/15 text-red-600 border-red-500/30",
  update_violation: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  apply_hold: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  release_hold: "bg-green-500/15 text-green-600 border-green-500/30",
  escalate: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  resolve: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  view_sensitive: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  acknowledge_sop: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  approve_escalation: "bg-green-500/15 text-green-600 border-green-500/30",
  deny_escalation: "bg-red-500/15 text-red-600 border-red-500/30",
  resolve_violation_via_escalation: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  block_violation_via_escalation: "bg-red-500/15 text-red-600 border-red-500/30",
};

const targetTypeColors: Record<string, string> = {
  violation: "text-red-600",
  hold: "text-purple-600",
  escalation: "text-yellow-600",
  user: "text-blue-600",
  job: "text-cyan-600",
  commission: "text-green-600",
};

function JsonViewer({ data }: { data: Json | null }) {
  if (!data) return <span className="text-muted-foreground">—</span>;
  
  return (
    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-w-md">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function ExpandableRow({ entry, onTargetClick }: { entry: AuditLogEntry; onTargetClick: (t: string, id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasMetadata = entry.metadata && Object.keys(entry.metadata as object).length > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <TableRow className="group">
        <TableCell className="text-xs">
          <div className="space-y-0.5">
            <div>{format(new Date(entry.created_at), "MMM d, yyyy")}</div>
            <div className="text-muted-foreground">
              {format(new Date(entry.created_at), "h:mm:ss a")}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-sm">
          {entry.actor_profile?.full_name || entry.actor_profile?.email || "System"}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={actionColors[entry.action] || ""}>
            {entry.action.replace(/_/g, " ")}
          </Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {entry.target_type ? (
            <span className={`text-sm capitalize ${targetTypeColors[entry.target_type] || ""}`}>
              {entry.target_type}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {entry.target_id ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-mono"
              onClick={() => entry.target_type && onTargetClick(entry.target_type, entry.target_id!)}
            >
              {entry.target_id.slice(0, 8)}...
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {hasMetadata ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </TableCell>
      </TableRow>
      {hasMetadata && (
        <CollapsibleContent asChild>
          <TableRow className="bg-muted/30">
            <TableCell colSpan={6} className="py-2">
              <div className="pl-4">
                <span className="text-xs text-muted-foreground block mb-1">Metadata:</span>
                <JsonViewer data={entry.metadata} />
              </div>
            </TableCell>
          </TableRow>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export function AuditLogTable({ entries, isLoading, onTargetClick }: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No audit log entries found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">Timestamp</TableHead>
            <TableHead className="w-[140px]">Actor</TableHead>
            <TableHead className="w-[150px]">Action</TableHead>
            <TableHead className="w-[100px] hidden md:table-cell">Target Type</TableHead>
            <TableHead className="w-[100px] hidden md:table-cell">Target ID</TableHead>
            <TableHead className="w-[60px] text-right">Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <ExpandableRow 
              key={entry.id} 
              entry={entry} 
              onTargetClick={onTargetClick}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
