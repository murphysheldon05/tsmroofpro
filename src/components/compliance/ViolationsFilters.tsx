import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CalendarIcon, X, Search } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const STATUSES = ["all", "open", "blocked", "escalated", "resolved"];
const SEVERITIES = ["all", "minor", "major", "severe"];
const SOP_KEYS = ["all", "SOP01", "SOP02", "SOP03", "SOP04", "SOP05", "SOP06", "SOP07", "SOP08", "SOP09", "SOP10"];
const DEPARTMENTS = ["all", "sales", "production", "supplements", "accounting", "hr", "admin"];

export interface ViolationsFiltersState {
  status: string;
  severity: string;
  sop: string;
  department: string;
  dateRange: DateRange | undefined;
  jobIdSearch: string;
}

interface ViolationsFiltersProps {
  filters: ViolationsFiltersState;
  onFiltersChange: (filters: ViolationsFiltersState) => void;
  onReset: () => void;
}

export function ViolationsFilters({ filters, onFiltersChange, onReset }: ViolationsFiltersProps) {
  const hasActiveFilters = 
    filters.status !== "all" || 
    filters.severity !== "all" || 
    filters.sop !== "all" || 
    filters.department !== "all" || 
    filters.dateRange !== undefined ||
    filters.jobIdSearch !== "";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
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

        {/* Severity */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Severity</Label>
          <Select
            value={filters.severity}
            onValueChange={(v) => onFiltersChange({ ...filters, severity: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s === "all" ? "All Severities" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* SOP */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">SOP</Label>
          <Select
            value={filters.sop}
            onValueChange={(v) => onFiltersChange({ ...filters, sop: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOP_KEYS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === "all" ? "All SOPs" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Department</Label>
          <Select
            value={filters.department}
            onValueChange={(v) => onFiltersChange({ ...filters, department: v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d} className="capitalize">
                  {d === "all" ? "All Departments" : d}
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

        {/* Job ID Search */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Job ID</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-9 pl-8"
              placeholder="Search..."
              value={filters.jobIdSearch}
              onChange={(e) => onFiltersChange({ ...filters, jobIdSearch: e.target.value })}
            />
          </div>
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
