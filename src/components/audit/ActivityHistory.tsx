import { useAuditLogForObject, getActionLabel } from "@/hooks/useAdminAuditLog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { History, User } from "lucide-react";

interface ActivityHistoryProps {
  objectType: string;
  objectId: string | undefined;
}

export function ActivityHistory({ objectType, objectId }: ActivityHistoryProps) {
  const { data: logs = [], isLoading } = useAuditLogForObject(objectType, objectId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No activity history yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="p-3 rounded-lg border bg-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-1.5 rounded-full bg-muted">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {log.performed_by_name || "System"}
                  </span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {getActionLabel(log.action_type)}
                  </Badge>
                </div>
                {log.notes && (
                  <p className="text-sm text-muted-foreground">{log.notes}</p>
                )}
                {(log.previous_value || log.new_value) && (
                  <div className="text-xs text-muted-foreground">
                    {log.previous_value && log.new_value ? (
                      <span>
                        Changed from <code className="bg-muted px-1 rounded">{JSON.stringify(log.previous_value)}</code>
                        {" "}to <code className="bg-muted px-1 rounded">{JSON.stringify(log.new_value)}</code>
                      </span>
                    ) : log.new_value ? (
                      <span>Set to <code className="bg-muted px-1 rounded">{JSON.stringify(log.new_value)}</code></span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(parseISO(log.created_at), "MMM d, h:mm a")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
