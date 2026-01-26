import { useState } from "react";
import { useAuditLogEntries, getActionLabel } from "@/hooks/useAdminAuditLog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { Search, Eye, User, FileText, DollarSign, Shield, Settings, Users } from "lucide-react";

const objectTypeIcons: Record<string, React.ElementType> = {
  user: User,
  commission: DollarSign,
  request: FileText,
  warranty: Shield,
  setting: Settings,
  team_assignment: Users,
};

const objectTypeColors: Record<string, string> = {
  user: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  commission: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  request: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  warranty: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  setting: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  team_assignment: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
};

interface AuditLogViewerProps {
  limit?: number;
}

export function AuditLogViewer({ limit = 500 }: AuditLogViewerProps) {
  const { data: logs = [], isLoading } = useAuditLogEntries(limit);
  const [searchTerm, setSearchTerm] = useState("");
  const [objectTypeFilter, setObjectTypeFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Get unique action types and object types for filters
  const actionTypes = [...new Set(logs.map(log => log.action_type))].sort();
  const objectTypes = [...new Set(logs.map(log => log.object_type))].sort();

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      searchTerm === "" ||
      log.performed_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performed_by_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.object_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesObjectType = objectTypeFilter === "all" || log.object_type === objectTypeFilter;
    const matchesAction = actionFilter === "all" || log.action_type === actionFilter;

    return matchesSearch && matchesObjectType && matchesAction;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Activity Audit Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, email, ID, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={objectTypeFilter} onValueChange={setObjectTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {objectTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {actionTypes.map(action => (
                <SelectItem key={action} value={action}>
                  {getActionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground">
          Showing {filteredLogs.length} of {logs.length} entries
        </p>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit log entries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = objectTypeIcons[log.object_type] || FileText;
                  const colorClass = objectTypeColors[log.object_type] || "bg-gray-100 text-gray-800";
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(parseISO(log.created_at), "MMM d, yyyy")}
                        <br />
                        <span className="text-muted-foreground text-xs">
                          {format(parseISO(log.created_at), "h:mm a")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">
                            {log.performed_by_name || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                            {log.performed_by_email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getActionLabel(log.action_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`gap-1 ${colorClass}`}>
                          <Icon className="h-3 w-3" />
                          {log.object_type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm text-muted-foreground truncate block">
                          {log.notes || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <AuditLogDetailDialog log={log} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface AuditLogDetailDialogProps {
  log: {
    id: string;
    action_type: string;
    object_type: string;
    object_id: string;
    previous_value: any;
    new_value: any;
    performed_by: string;
    performed_by_email: string | null;
    performed_by_name: string | null;
    notes: string | null;
    created_at: string;
  };
}

function AuditLogDetailDialog({ log }: AuditLogDetailDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Timestamp</span>
              <p className="font-medium">
                {format(parseISO(log.created_at), "MMMM d, yyyy 'at' h:mm:ss a")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Performed By</span>
              <p className="font-medium">{log.performed_by_name || "Unknown"}</p>
              <p className="text-xs text-muted-foreground">{log.performed_by_email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Action</span>
              <p className="font-medium">{getActionLabel(log.action_type)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Object Type</span>
              <p className="font-medium capitalize">{log.object_type.replace(/_/g, " ")}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Object ID</span>
              <p className="font-mono text-xs bg-muted p-2 rounded mt-1 break-all">{log.object_id}</p>
            </div>
            {log.notes && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Notes</span>
                <p className="font-medium mt-1">{log.notes}</p>
              </div>
            )}
          </div>

          {(log.previous_value || log.new_value) && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Changes</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Previous Value</span>
                  <pre className="text-xs bg-red-50 dark:bg-red-950 p-3 rounded mt-1 overflow-auto max-h-40">
                    {log.previous_value ? JSON.stringify(log.previous_value, null, 2) : "null"}
                  </pre>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">New Value</span>
                  <pre className="text-xs bg-green-50 dark:bg-green-950 p-3 rounded mt-1 overflow-auto max-h-40">
                    {log.new_value ? JSON.stringify(log.new_value, null, 2) : "null"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
