import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "closed", label: "Closed" },
];

export interface EscalationsFiltersState {
  status: string;
}

interface EscalationsFiltersProps {
  filters: EscalationsFiltersState;
  onFiltersChange: (filters: EscalationsFiltersState) => void;
  onReset: () => void;
}

export function EscalationsFilters({ filters, onFiltersChange, onReset }: EscalationsFiltersProps) {
  const hasActiveFilters = filters.status !== "all";

  return (
    <div className="space-y-3">
      <div className="flex gap-3 items-end">
        {/* Status */}
        <div className="space-y-1 w-48">
          <Label className="text-xs text-muted-foreground">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(v) => onFiltersChange({ ...filters, status: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
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
