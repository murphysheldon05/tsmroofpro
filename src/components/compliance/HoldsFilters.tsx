import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const STATUSES = ["all", "active", "released"];
const HOLD_TYPES = [
  { value: "all", label: "All Types" },
  { value: "commission_hold", label: "Commission Hold" },
  { value: "invoice_hold", label: "Invoice Hold" },
  { value: "scheduling_hold", label: "Scheduling Hold" },
  { value: "access_hold", label: "Access Hold" },
];

export interface HoldsFiltersState {
  status: string;
  holdType: string;
  dateRange: DateRange | undefined;
}

interface HoldsFiltersProps {
  filters: HoldsFiltersState;
  onFiltersChange: (filters: HoldsFiltersState) => void;
  onReset: () => void;
}

export function HoldsFilters({ filters, onFiltersChange, onReset }: HoldsFiltersProps) {
  const hasActiveFilters = 
    filters.status !== "all" || 
    filters.holdType !== "all" || 
    filters.dateRange !== undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* Status */}
        <div className="space-y-1">
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
                <SelectItem key={s} value={s} className="capitalize">
                  {s === "all" ? "All Statuses" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Hold Type */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Hold Type</Label>
          <Select
            value={filters.holdType}
            onValueChange={(v) => onFiltersChange({ ...filters, holdType: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HOLD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Date Range</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 w-full justify-start text-left font-normal",
                  !filters.dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange?.from ? (
                  filters.dateRange.to ? (
                    <span className="text-xs">
                      {format(filters.dateRange.from, "MM/dd")} - {format(filters.dateRange.to, "MM/dd")}
                    </span>
                  ) : (
                    format(filters.dateRange.from, "MM/dd/yy")
                  )
                ) : (
                  <span className="text-xs">Pick dates</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={filters.dateRange?.from}
                selected={filters.dateRange}
                onSelect={(range) => onFiltersChange({ ...filters, dateRange: range })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-7 text-xs"
        >
          <X className="w-3 h-3 mr-1" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
