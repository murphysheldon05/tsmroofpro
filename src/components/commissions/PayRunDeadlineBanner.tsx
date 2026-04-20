import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, Clock, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isBeforeSubmissionDeadline,
  getCurrentPayRunPeriod,
  getNextPayRunPeriod,
  getDeadlineCountdown,
  getRevisionDeadlineCountdown,
  formatPayRunRange,
} from "@/lib/commissionPayDateCalculations";

type Countdown = { hours: number; minutes: number; totalMs: number } | null;

function CountdownDisplay({ countdown, label }: { countdown: Countdown; label: string }) {
  if (!countdown) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground/60 line-through">
        {label}
      </span>
    );
  }

  const isUrgent = countdown.totalMs <= 2 * 60 * 60 * 1000;
  const showCountdown = countdown.totalMs <= 48 * 60 * 60 * 1000;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(isUrgent && "text-red-600 font-semibold")}>{label}</span>
      {showCountdown && (
        <Badge
          variant="outline"
          className={cn(
            "font-mono tabular-nums text-[10px] py-0 px-1.5",
            isUrgent
              ? "bg-red-50 dark:bg-red-950/30 text-red-600 border-red-300 animate-pulse"
              : "bg-primary/5 text-primary border-primary/20"
          )}
        >
          <Clock className="h-2.5 w-2.5 mr-0.5" />
          {countdown.hours}h {String(countdown.minutes).padStart(2, "0")}m
        </Badge>
      )}
    </span>
  );
}

export function PayRunDeadlineBanner() {
  const [submissionCountdown, setSubmissionCountdown] = useState<Countdown>(getDeadlineCountdown());
  const [revisionCountdown, setRevisionCountdown] = useState<Countdown>(getRevisionDeadlineCountdown());
  const [beforeDeadline, setBeforeDeadline] = useState(isBeforeSubmissionDeadline());

  useEffect(() => {
    const interval = setInterval(() => {
      setSubmissionCountdown(getDeadlineCountdown());
      setRevisionCountdown(getRevisionDeadlineCountdown());
      setBeforeDeadline(isBeforeSubmissionDeadline());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentPeriod = getCurrentPayRunPeriod();
  const nextPeriod = getNextPayRunPeriod();

  const allPassed = !submissionCountdown && !revisionCountdown;

  if (allPassed) {
    return (
      <Alert className="border-gray-300 bg-gray-50 dark:bg-gray-950/20 dark:border-gray-700">
        <Lock className="h-4 w-4 text-gray-500" />
        <AlertTitle className="text-gray-700 dark:text-gray-400">
          Pay Run Locked — {formatPayRunRange(currentPeriod.periodStart, currentPeriod.periodEnd)}
        </AlertTitle>
        <AlertDescription className="text-gray-600 dark:text-gray-500">
          All deadlines have passed. Submissions will go into next week's pay run:{" "}
          <strong>{formatPayRunRange(nextPeriod.periodStart, nextPeriod.periodEnd)}</strong>
        </AlertDescription>
      </Alert>
    );
  }

  if (beforeDeadline) {
    return (
      <Alert className="border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-700">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-300">
          Current Pay Run: {formatPayRunRange(currentPeriod.periodStart, currentPeriod.periodEnd)}
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-400">
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <CountdownDisplay
              countdown={submissionCountdown}
              label={`Submission: ${currentPeriod.submissionDeadlineDisplay}`}
            />
            <CountdownDisplay
              countdown={revisionCountdown}
              label={`Revision grace: ${currentPeriod.revisionDeadlineDisplay}`}
            />
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800 dark:text-yellow-300">
        Friday 11:59 PM Submission Deadline Has Passed
      </AlertTitle>
      <AlertDescription className="text-yellow-700 dark:text-yellow-400">
        <p>
          New submissions will go into next week's pay run:{" "}
          <strong>{formatPayRunRange(nextPeriod.periodStart, nextPeriod.periodEnd)}</strong>
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          <CountdownDisplay
            countdown={submissionCountdown}
            label="Submission cutoff"
          />
          <CountdownDisplay
            countdown={revisionCountdown}
            label="Revision grace"
          />
        </div>
      </AlertDescription>
    </Alert>
  );
}
