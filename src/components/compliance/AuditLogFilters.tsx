import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { X } from "lucide-react";

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "create_violation", label: "Create Violation" },
  { value: "update_violation", label: "Update Violation" },
  { value: "apply_hold", label: "Apply Hold" },
  { value: "release_hold", label: "Release Hold" },
  { value: "escalate", label: "Escalate" },
  { value: "resolve", label: "Resolve" },
  { value: "view_sensitive", label: "View Sensitive" },
  { value: "acknowledge_sop", label: "Acknowledge SOP" },
];

const TARGET_TYPES = [
  { value: "all", label: "All Targets" },
  { value: "violation", label: "Violation" },
  { value: "hold", label: "Hold" },
  { value: "escalation", label: "Escalation" },
  { value: "user", label: "User" },
  { value: "job", label: "Job" },
  { value: "commission", label: "Commission" },
];

export interface AuditLogFiltersState {
  dateFrom: string;
  dateTo: string;
  actorId: string;
  actionType: string;
  targetType: string;
}

interface AuditLogFiltersProps {
  filters: AuditLogFiltersState;
  onFiltersChange: (filters: AuditLogFiltersState) => void;
  onReset: () => void;
  users: Array<{ id: string; full_name: string | null; email: string }>;
}

export function AuditLogFilters({ filters, onFiltersChange, onReset, users }: AuditLogFiltersProps) {
  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.actorId !== "all" ||
    filters.actionType !== "all" ||
    filters.targetType !== "all";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Date From */}
        <div className="w-40">
          <DatePickerField
            label="From Date"
            value={filters.dateFrom}
            onChange={(v) => onFiltersChange({ ...filters, dateFrom: v })}
            placeholder="Start date"
          />
        </div>

        {/* Date To */}
        <div className="w-40">
          <DatePickerField
            label="To Date"
            value={filters.dateTo}
            onChange={(v) => onFiltersChange({ ...filters, dateTo: v })}
            placeholder="End date"
          />
        </div>

        {/* Actor */}
        <div className="space-y-1 w-48">
          <Label className="text-xs text-muted-foreground">Actor</Label>
          <Select
            value={filters.actorId}
            onValueChange={(v) => onFiltersChange({ ...filters, actorId: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Type */}
        <div className="space-y-1 w-44">
          <Label className="text-xs text-muted-foreground">Action</Label>
          <Select
            value={filters.actionType}
            onValueChange={(v) => onFiltersChange({ ...filters, actionType: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Target Type */}
        <div className="space-y-1 w-40">
          <Label className="text-xs text-muted-foreground">Target</Label>
          <Select
            value={filters.targetType}
            onValueChange={(v) => onFiltersChange({ ...filters, targetType: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
