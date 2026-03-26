/**
 * Pay Date Calculation Utility for Commission Submissions
 *
 * All cutoff logic uses America/Phoenix (MST, no DST). Instants are compared in UTC ms.
 */

import {
  getPhoenixParts,
  phoenixWallToUtc,
  getMostRecentSaturdayYMD,
  addCalendarDaysYMD,
  getSubmissionCutoffExclusiveInstant,
  getRevisionCutoffExclusiveInstant,
  formatInstantInPhoenixMST,
} from "./phoenixTime";

function ymdToDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Friday YYYY-MM-DD for a pay run that starts on `periodStart` (Saturday). */
export function getFridayDateStringForPeriodStart(periodStartYmd: string): string {
  const [y, m, d] = periodStartYmd.split("-").map(Number);
  const fri = addCalendarDaysYMD(y, m, d, 6);
  return ymdToDateString(fri.year, fri.month, fri.day);
}

/**
 * Calculate the scheduled Friday pay date (period end) based on a timestamp.
 */
export function calculateScheduledPayDate(approvalDate: Date): Date {
  const s = getScheduledPayDateString(approvalDate);
  return new Date(s + "T12:00:00.000Z");
}

export function formatPayDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatPayDateShort(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function getEstimatedPayDate(): Date {
  return calculateScheduledPayDate(new Date());
}

/**
 * Friday (period_end) YYYY-MM-DD for the pay run that contains this submission instant.
 */
export function getScheduledPayDateString(timestamp: Date): string {
  const p = getPhoenixParts(timestamp);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const cutoff = getSubmissionCutoffExclusiveInstant(sat);
  let periodSat = sat;
  if (timestamp.getTime() >= cutoff.getTime()) {
    periodSat = addCalendarDaysYMD(sat.year, sat.month, sat.day, 7);
  }
  const fri = addCalendarDaysYMD(periodSat.year, periodSat.month, periodSat.day, 6);
  return ymdToDateString(fri.year, fri.month, fri.day);
}

/**
 * Calculate the pay date for a resubmitted commission (after rejection).
 */
export function calculateResubmissionPayDate(existingPayDate: string | null): string {
  if (!existingPayDate) {
    return getScheduledPayDateString(new Date());
  }

  const now = new Date();
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const revCutoff = getRevisionCutoffExclusiveInstant(sat);

  const friThis = addCalendarDaysYMD(sat.year, sat.month, sat.day, 6);
  const thisWeekFri = ymdToDateString(friThis.year, friThis.month, friThis.day);

  const wasThisWeek = existingPayDate === thisWeekFri;
  const beforeRev = now.getTime() < revCutoff.getTime();

  if (wasThisWeek && beforeRev) {
    return existingPayDate;
  }

  return getScheduledPayDateString(now);
}

export function getCurrentDeadlineInfo(): {
  submissionDeadline: string;
  revisionDeadline: string;
  payDate: string;
} {
  const period = getCurrentPayRunPeriod();
  const [ys, ms, ds] = period.periodStart.split("-").map(Number);
  const tue = addCalendarDaysYMD(ys, ms, ds, 3);
  const wed = addCalendarDaysYMD(ys, ms, ds, 4);
  const fri = addCalendarDaysYMD(ys, ms, ds, 6);

  const tueDt = phoenixWallToUtc(tue.year, tue.month, tue.day, 15, 0, 0);
  const wedDt = phoenixWallToUtc(wed.year, wed.month, wed.day, 12, 0, 0);

  return {
    submissionDeadline:
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Phoenix",
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(tueDt) + " at 3:00 PM MST",
    revisionDeadline:
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Phoenix",
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(wedDt) + " at 12:00 PM MST",
    payDate: formatPayDateShort(ymdToDateString(fri.year, fri.month, fri.day)),
  };
}

// ═══════════════════════════════════════════════════════════════
// Period-based pay run helpers (Saturday–Friday cycle)
// ═══════════════════════════════════════════════════════════════

export interface PayRunPeriod {
  periodStart: string;
  periodEnd: string;
  submissionDeadline: Date;
  revisionDeadline: Date;
  submissionDeadlineDisplay: string;
  revisionDeadlineDisplay: string;
}

function buildPayRunPeriodFromSaturday(sat: { year: number; month: number; day: number }): PayRunPeriod {
  const fri = addCalendarDaysYMD(sat.year, sat.month, sat.day, 6);
  const tue = addCalendarDaysYMD(sat.year, sat.month, sat.day, 3);
  const wed = addCalendarDaysYMD(sat.year, sat.month, sat.day, 4);

  const submissionDeadline = phoenixWallToUtc(tue.year, tue.month, tue.day, 15, 0, 0);
  const revisionDeadline = phoenixWallToUtc(wed.year, wed.month, wed.day, 12, 0, 0);

  return {
    periodStart: ymdToDateString(sat.year, sat.month, sat.day),
    periodEnd: ymdToDateString(fri.year, fri.month, fri.day),
    submissionDeadline,
    revisionDeadline,
    submissionDeadlineDisplay:
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Phoenix",
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(submissionDeadline) + " at 3:00 PM MST",
    revisionDeadlineDisplay:
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Phoenix",
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(revisionDeadline) + " at 12:00 PM MST",
  };
}

export function getCurrentPayRunPeriod(now: Date = new Date()): PayRunPeriod {
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  return buildPayRunPeriodFromSaturday(sat);
}

export function getNextPayRunPeriod(now: Date = new Date()): PayRunPeriod {
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const nextSat = addCalendarDaysYMD(sat.year, sat.month, sat.day, 7);
  return buildPayRunPeriodFromSaturday(nextSat);
}

/**
 * True if instant is strictly before Tuesday 3:00:01 PM Phoenix for the current pay run week.
 */
export function isBeforeSubmissionDeadline(now: Date = new Date()): boolean {
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const cutoff = getSubmissionCutoffExclusiveInstant(sat);
  return now.getTime() < cutoff.getTime();
}

/**
 * True if instant is strictly before Wednesday 12:00:01 PM Phoenix for the current pay run week.
 */
export function isBeforeRevisionDeadline(now: Date = new Date()): boolean {
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const cutoff = getRevisionCutoffExclusiveInstant(sat);
  return now.getTime() < cutoff.getTime();
}

export function formatPayRunRange(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart + "T12:00:00.000Z");
  const end = new Date(periodEnd + "T12:00:00.000Z");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Phoenix" });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Countdown to Tuesday 3:00:00 PM Phoenix (current pay run). Null if deadline passed.
 */
export function getDeadlineCountdown(now: Date = new Date()): { hours: number; minutes: number; totalMs: number } | null {
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const tue = addCalendarDaysYMD(sat.year, sat.month, sat.day, 3);
  const deadline = phoenixWallToUtc(tue.year, tue.month, tue.day, 15, 0, 0);
  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, totalMs: diff };
}

export function formatTimestampMST(isoString: string): string {
  return formatInstantInPhoenixMST(isoString);
}

export function getPeriodStartForDate(date: Date): string {
  const p = getPhoenixParts(date);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  return ymdToDateString(sat.year, sat.month, sat.day);
}

export function determinePayRunForSubmission(now: Date = new Date()): {
  periodStart: string;
  isLate: boolean;
} {
  if (isBeforeSubmissionDeadline(now)) {
    return { periodStart: getCurrentPayRunPeriod(now).periodStart, isLate: false };
  }
  return { periodStart: getNextPayRunPeriod(now).periodStart, isLate: true };
}

export function determinePayRunForRevision(originalPeriodStart: string | null, now: Date = new Date()): {
  periodStart: string;
  isLateRevision: boolean;
  rolled: boolean;
} {
  const currentPeriod = getCurrentPayRunPeriod(now);

  if (originalPeriodStart === currentPeriod.periodStart && isBeforeRevisionDeadline(now)) {
    return { periodStart: originalPeriodStart, isLateRevision: false, rolled: false };
  }

  const nextPeriod = getNextPayRunPeriod(now);
  return { periodStart: nextPeriod.periodStart, isLateRevision: true, rolled: true };
}
