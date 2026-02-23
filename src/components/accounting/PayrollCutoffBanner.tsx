import { useMemo } from "react";
import { Clock, CalendarCheck, AlertTriangle } from "lucide-react";
import { calculateScheduledPayDate, formatPayDateShort } from "@/lib/commissionPayDateCalculations";

export function PayrollCutoffBanner() {
  const { isBeforeDeadline, nextPayDate, timeUntilCutoff } = useMemo(() => {
    const now = new Date();
    // Convert to MST (UTC-7)
    const mstOffset = -7 * 60;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mstTime = new Date(utcTime + (mstOffset * 60000));
    
    const dayOfWeek = mstTime.getDay();
    const hour = mstTime.getHours();
    const minutes = mstTime.getMinutes();
    
    const before = dayOfWeek < 2 || (dayOfWeek === 2 && hour < 15);
    const payDate = calculateScheduledPayDate(now);

    // Calculate time until Tuesday 3 PM MST
    let daysUntilTuesday = (2 - dayOfWeek + 7) % 7;
    if (daysUntilTuesday === 0 && hour >= 15) daysUntilTuesday = 7;
    
    const hoursLeft = daysUntilTuesday > 0 
      ? (daysUntilTuesday * 24) - hour + 15 - (minutes > 0 ? 1 : 0)
      : 15 - hour;
    
    const daysLeft = Math.floor(hoursLeft / 24);
    const remainingHours = hoursLeft % 24;

    return {
      isBeforeDeadline: before,
      nextPayDate: payDate,
      timeUntilCutoff: daysLeft > 0 ? `${daysLeft}d ${remainingHours}h` : `${remainingHours}h`,
    };
  }, []);

  return (
    <div
      data-tutorial="pay-run-cutoff"
      className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
      isBeforeDeadline 
        ? "bg-emerald-500/10 border-emerald-500/30" 
        : "bg-amber-500/10 border-amber-500/30"
    }`}>
      <div className="flex items-center gap-3 flex-1">
        {isBeforeDeadline ? (
          <CalendarCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        )}
        <div>
          <p className="text-sm font-semibold">
            {isBeforeDeadline 
              ? "Payroll Window Open" 
              : "Payroll Cutoff Passed"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isBeforeDeadline
              ? `Cutoff: Tuesday 3:00 PM MST · ${timeUntilCutoff} remaining · Submit anytime — pay run assigned automatically`
              : "Submissions now assigned to next Friday's pay run · You can always submit"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span>Next Pay Date: <strong>{formatPayDateShort(nextPayDate)}</strong></span>
      </div>
    </div>
  );
}
