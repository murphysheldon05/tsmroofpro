import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import {
  isBeforeSubmissionDeadline,
  getCurrentPayRunPeriod,
  getNextPayRunPeriod,
  getDeadlineCountdown,
  formatPayRunRange,
} from "@/lib/commissionPayDateCalculations";

export function PayRunDeadlineBanner() {
  const [countdown, setCountdown] = useState(getDeadlineCountdown());
  const [beforeDeadline, setBeforeDeadline] = useState(isBeforeSubmissionDeadline());

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getDeadlineCountdown());
      setBeforeDeadline(isBeforeSubmissionDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentPeriod = getCurrentPayRunPeriod();
  const nextPeriod = getNextPayRunPeriod();

  if (beforeDeadline) {
    const showCountdown = countdown && countdown.totalMs <= 24 * 60 * 60 * 1000;

    return (
      <Alert className="border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-700">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-300">
          Current Pay Run: {formatPayRunRange(currentPeriod.periodStart, currentPeriod.periodEnd)}
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          <span>Deadline: {currentPeriod.submissionDeadlineDisplay}</span>
          {showCountdown && countdown && (
            <span className="ml-2 inline-flex items-center gap-1 font-semibold">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">
                {countdown.hours}h {String(countdown.minutes).padStart(2, "0")}m
              </span>
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-300">
        Tuesday 3:00 PM Deadline Has Passed
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-400">
        This commission will be included in next week's pay run:{" "}
        <strong>{formatPayRunRange(nextPeriod.periodStart, nextPeriod.periodEnd)}</strong>
      </AlertDescription>
    </Alert>
  );
}
