import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getCurrentPeriod, formatPeriodLabel, toDateString } from "@/lib/kpiTypes";

interface PeriodSelectorProps {
  frequency: string;
  periodStart: Date;
  periodEnd: Date;
  onChange: (start: Date, end: Date) => void;
}

function shiftPeriod(start: Date, end: Date, frequency: string, direction: -1 | 1) {
  const d = new Date(start);
  if (frequency === "monthly") {
    d.setMonth(d.getMonth() + direction);
    const newStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const newEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: newStart, end: newEnd };
  }
  if (frequency === "biweekly") {
    d.setDate(d.getDate() + direction * 15);
    const isFirstHalf = d.getDate() <= 15;
    const newStart = isFirstHalf
      ? new Date(d.getFullYear(), d.getMonth(), 1)
      : new Date(d.getFullYear(), d.getMonth(), 16);
    const newEnd = isFirstHalf
      ? new Date(d.getFullYear(), d.getMonth(), 15)
      : new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: newStart, end: newEnd };
  }
  // weekly
  const newStart = new Date(start);
  newStart.setDate(newStart.getDate() + direction * 7);
  const newEnd = new Date(newStart);
  newEnd.setDate(newStart.getDate() + 6);
  return { start: newStart, end: newEnd };
}

export function PeriodSelector({
  frequency,
  periodStart,
  periodEnd,
  onChange,
}: PeriodSelectorProps) {
  const current = getCurrentPeriod(frequency);
  const isCurrentPeriod =
    toDateString(periodStart) === toDateString(current.start);

  const label = useMemo(
    () => formatPeriodLabel(periodStart, periodEnd, frequency),
    [periodStart, periodEnd, frequency]
  );

  const prefix = frequency === "weekly" ? "Week of " : "";

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => {
          const shifted = shiftPeriod(periodStart, periodEnd, frequency, -1);
          onChange(shifted.start, shifted.end);
        }}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="text-sm font-medium min-w-[160px] text-center">
        {prefix}{label}
      </span>

      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        disabled={isCurrentPeriod}
        onClick={() => {
          const shifted = shiftPeriod(periodStart, periodEnd, frequency, 1);
          onChange(shifted.start, shifted.end);
        }}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
