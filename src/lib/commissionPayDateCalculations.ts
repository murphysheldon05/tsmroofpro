/**
 * Pay Date Calculation Utility for Commission Submissions
 *
 * Pay cycle: Saturday through Friday.
 * Three deadlines per pay run (all times MST / America/Phoenix):
 *   1. Standard submission:   Friday   11:59 PM  (day +6 from period Saturday)
 *   2. Friday-close exception: Monday  12:00 PM  (day +9 from period Saturday)
 *   3. Correction / revision:  Wednesday 12:00 PM (day +11 from period Saturday)
 *
 * Deadlines 2 and 3 fall in the calendar week *after* the pay run period ends.
 *
 * Pay run date (actual payday) is the Friday AFTER the period ends (day +13
 * from the period's Saturday start).  E.g. period Apr 11–17 → pay date Apr 24.
 */

import {
  getPhoenixParts,
  phoenixWallToUtc,
  getMostRecentSaturdayYMD,
  addCalendarDaysYMD,
  getSubmissionCutoffExclusiveInstant,
  getFridayCloseExceptionCutoffInstant,
  getRevisionCutoffExclusiveInstant,
  formatInstantInPhoenixMST,
} from "./phoenixTime";

function ymdToDateString(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parsePeriodStart(ymd: string): { year: number; month: number; day: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  return { year: y, month: m, day: d };
}

/** Pay-date Friday YYYY-MM-DD — the Friday *after* the period ends (day +13 from Saturday start). */
export function getFridayDateStringForPeriodStart(periodStartYmd: string): string {
  const s = parsePeriodStart(periodStartYmd);
  const payFri = addCalendarDaysYMD(s.year, s.month, s.day, 13);
  return ymdToDateString(payFri.year, payFri.month, payFri.day);
}

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
 * Pay-date Friday YYYY-MM-DD for the pay run that contains this submission.
 * The pay date is the Friday AFTER the period ends (day +13 from period Saturday).
 * Standard submissions use Friday 11:59 PM cutoff.
 * Friday-close submissions get until Monday noon of the following week.
 */
export function getScheduledPayDateString(timestamp: Date, isFridayClose = false): string {
  const p = getPhoenixParts(timestamp);
  const currentSat = getMostRecentSaturdayYMD(p.year, p.month, p.day);

  if (!isFridayClose) {
    const cutoff = getSubmissionCutoffExclusiveInstant(currentSat);
    let periodSat = currentSat;
    if (timestamp.getTime() >= cutoff.getTime()) {
      periodSat = addCalendarDaysYMD(currentSat.year, currentSat.month, currentSat.day, 7);
    }
    const payFri = addCalendarDaysYMD(periodSat.year, periodSat.month, periodSat.day, 13);
    return ymdToDateString(payFri.year, payFri.month, payFri.day);
  }

  // Friday close: check if previous period's exception window is still open
  const prevSat = addCalendarDaysYMD(currentSat.year, currentSat.month, currentSat.day, -7);
  const prevFridayCloseCutoff = getFridayCloseExceptionCutoffInstant(prevSat);
  if (timestamp.getTime() < prevFridayCloseCutoff.getTime()) {
    const payFri = addCalendarDaysYMD(prevSat.year, prevSat.month, prevSat.day, 13);
    return ymdToDateString(payFri.year, payFri.month, payFri.day);
  }

  // Exception window passed — use standard logic for current period
  const cutoff = getSubmissionCutoffExclusiveInstant(currentSat);
  let periodSat = currentSat;
  if (timestamp.getTime() >= cutoff.getTime()) {
    periodSat = addCalendarDaysYMD(currentSat.year, currentSat.month, currentSat.day, 7);
  }
  const payFri = addCalendarDaysYMD(periodSat.year, periodSat.month, periodSat.day, 13);
  return ymdToDateString(payFri.year, payFri.month, payFri.day);
}

/**
 * Pay date for a resubmitted commission (after rejection).
 * Checks the correction deadline for the commission's original pay run.
 * Pay dates are the Friday after the period ends (day +13 from period Saturday).
 */
export function calculateResubmissionPayDate(existingPayDate: string | null): string {
  if (!existingPayDate) {
    return getScheduledPayDateString(new Date());
  }

  const now = new Date();
  const p = getPhoenixParts(now);
  const currentSat = getMostRecentSaturdayYMD(p.year, p.month, p.day);

  // Pay date for the current period (Friday after the period ends)
  const currentPayFri = addCalendarDaysYMD(currentSat.year, currentSat.month, currentSat.day, 13);
  const currentWeekPayDate = ymdToDateString(currentPayFri.year, currentPayFri.month, currentPayFri.day);

  if (existingPayDate === currentWeekPayDate) {
    const revCutoff = getRevisionCutoffExclusiveInstant(currentSat);
    if (now.getTime() < revCutoff.getTime()) {
      return existingPayDate;
    }
  }

  // Check previous pay run (correction deadline extends into current week)
  const prevSat = addCalendarDaysYMD(currentSat.year, currentSat.month, currentSat.day, -7);
  const prevPayFri = addCalendarDaysYMD(prevSat.year, prevSat.month, prevSat.day, 13);
  const prevWeekPayDate = ymdToDateString(prevPayFri.year, prevPayFri.month, prevPayFri.day);

  if (existingPayDate === prevWeekPayDate) {
    const revCutoff = getRevisionCutoffExclusiveInstant(prevSat);
    if (now.getTime() < revCutoff.getTime()) {
      return existingPayDate;
    }
  }

  return getScheduledPayDateString(now);
}

const fmtWeekday = (d: Date) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(d);

export function getCurrentDeadlineInfo(): {
  submissionDeadline: string;
  fridayBuildGrace: string;
  revisionDeadline: string;
  payDate: string;
} {
  const period = getCurrentPayRunPeriod();
  const s = parsePeriodStart(period.periodStart);
  const fri = addCalendarDaysYMD(s.year, s.month, s.day, 6);
  const mon = addCalendarDaysYMD(s.year, s.month, s.day, 9);
  const wed = addCalendarDaysYMD(s.year, s.month, s.day, 11);
  const payFri = addCalendarDaysYMD(s.year, s.month, s.day, 13);

  const friDt = phoenixWallToUtc(fri.year, fri.month, fri.day, 23, 59, 0);
  const monDt = phoenixWallToUtc(mon.year, mon.month, mon.day, 12, 0, 0);
  const wedDt = phoenixWallToUtc(wed.year, wed.month, wed.day, 12, 0, 0);

  return {
    submissionDeadline: fmtWeekday(friDt) + " at 11:59 PM MST",
    fridayBuildGrace: fmtWeekday(monDt) + " at 12:00 PM MST",
    revisionDeadline: fmtWeekday(wedDt) + " at 12:00 PM MST",
    payDate: formatPayDateShort(ymdToDateString(payFri.year, payFri.month, payFri.day)),
  };
}

/** Info about the pay run being paid out this week (previous period). */
export interface CurrentPaydayInfo {
  payDate: string;
  payDateDisplay: string;
  periodStart: string;
  periodEnd: string;
  periodDisplay: string;
}

export function getCurrentPaydayInfo(now: Date = new Date()): CurrentPaydayInfo {
  const p = getPhoenixParts(now);
  const currentSat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const prevSat = addCalendarDaysYMD(currentSat.year, currentSat.month, currentSat.day, -7);
  const prevFri = addCalendarDaysYMD(prevSat.year, prevSat.month, prevSat.day, 6);
  const payFri = addCalendarDaysYMD(prevSat.year, prevSat.month, prevSat.day, 13);

  const payDateYmd = ymdToDateString(payFri.year, payFri.month, payFri.day);
  const periodStartYmd = ymdToDateString(prevSat.year, prevSat.month, prevSat.day);
  const periodEndYmd = ymdToDateString(prevFri.year, prevFri.month, prevFri.day);

  return {
    payDate: payDateYmd,
    payDateDisplay: formatPayDateShort(payDateYmd),
    periodStart: periodStartYmd,
    periodEnd: periodEndYmd,
    periodDisplay: formatPayRunRange(periodStartYmd, periodEndYmd),
  };
}

// ═══════════════════════════════════════════════════════════════
// Period-based pay run helpers (Saturday–Friday cycle)
// ═══════════════════════════════════════════════════════════════

export interface PayRunPeriod {
  periodStart: string;
  periodEnd: string;
  submissionDeadline: Date;
  fridayBuildGraceDeadline: Date;
  revisionDeadline: Date;
  submissionDeadlineDisplay: string;
  fridayBuildGraceDisplay: string;
  revisionDeadlineDisplay: string;
}

function buildPayRunPeriodFromSaturday(sat: { year: number; month: number; day: number }): PayRunPeriod {
  const fri = addCalendarDaysYMD(sat.year, sat.month, sat.day, 6);
  const mon = addCalendarDaysYMD(sat.year, sat.month, sat.day, 9);
  const wed = addCalendarDaysYMD(sat.year, sat.month, sat.day, 11);

  const submissionDeadline = phoenixWallToUtc(fri.year, fri.month, fri.day, 23, 59, 0);
  const fridayBuildGraceDeadline = phoenixWallToUtc(mon.year, mon.month, mon.day, 12, 0, 0);
  const revisionDeadline = phoenixWallToUtc(wed.year, wed.month, wed.day, 12, 0, 0);

  return {
    periodStart: ymdToDateString(sat.year, sat.month, sat.day),
    periodEnd: ymdToDateString(fri.year, fri.month, fri.day),
    submissionDeadline,
    fridayBuildGraceDeadline,
    revisionDeadline,
    submissionDeadlineDisplay: fmtWeekday(submissionDeadline) + " at 11:59 PM MST",
    fridayBuildGraceDisplay: fmtWeekday(fridayBuildGraceDeadline) + " at 12:00 PM MST",
    revisionDeadlineDisplay: fmtWeekday(revisionDeadline) + " at 12:00 PM MST",
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

export function getPayRunPeriodForStart(periodStartYmd: string): PayRunPeriod {
  const s = parsePeriodStart(periodStartYmd);
  return buildPayRunPeriodFromSaturday(s);
}

/**
 * True if now is before the standard Friday 11:59 PM cutoff for the current pay run.
 */
export function isBeforeSubmissionDeadline(now: Date = new Date()): boolean {
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const cutoff = getSubmissionCutoffExclusiveInstant(sat);
  return now.getTime() < cutoff.getTime();
}

/**
 * True if the Friday-close exception window for the *previous* pay run is still open.
 * (Monday noon falls in the current calendar week but belongs to the prior pay run.)
 */
export function isBeforeFridayCloseDeadline(now: Date = new Date()): boolean {
  const p = getPhoenixParts(now);
  const currentSat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const prevSat = addCalendarDaysYMD(currentSat.year, currentSat.month, currentSat.day, -7);
  const cutoff = getFridayCloseExceptionCutoffInstant(prevSat);
  return now.getTime() < cutoff.getTime();
}

/**
 * True if the correction/revision deadline for the current pay run has not passed.
 * (Wednesday noon at day +11 from this week's Saturday.)
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

// ═══════════════════════════════════════════════════════════════
// Countdown helpers (return null when the deadline has already passed)
// ═══════════════════════════════════════════════════════════════

type Countdown = { hours: number; minutes: number; totalMs: number } | null;

function msToCountdown(diff: number): Countdown {
  if (diff <= 0) return null;
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    totalMs: diff,
  };
}

/** Countdown to the current pay run's Friday 11:59 PM standard submission cutoff. */
export function getDeadlineCountdown(now: Date = new Date()): Countdown {
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const fri = addCalendarDaysYMD(sat.year, sat.month, sat.day, 6);
  const deadline = phoenixWallToUtc(fri.year, fri.month, fri.day, 23, 59, 0);
  return msToCountdown(deadline.getTime() - now.getTime());
}

/** Countdown to the current pay run's Monday noon Friday-close exception. */
export function getFridayCloseDeadlineCountdown(now: Date = new Date()): Countdown {
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const mon = addCalendarDaysYMD(sat.year, sat.month, sat.day, 9);
  const deadline = phoenixWallToUtc(mon.year, mon.month, mon.day, 12, 0, 0);
  return msToCountdown(deadline.getTime() - now.getTime());
}

/** Countdown to the current pay run's Wednesday noon correction deadline. */
export function getRevisionDeadlineCountdown(now: Date = new Date()): Countdown {
  const p = getPhoenixParts(now);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  const wed = addCalendarDaysYMD(sat.year, sat.month, sat.day, 11);
  const deadline = phoenixWallToUtc(wed.year, wed.month, wed.day, 12, 0, 0);
  return msToCountdown(deadline.getTime() - now.getTime());
}

export function formatTimestampMST(isoString: string): string {
  return formatInstantInPhoenixMST(isoString);
}

export function getPeriodStartForDate(date: Date): string {
  const p = getPhoenixParts(date);
  const sat = getMostRecentSaturdayYMD(p.year, p.month, p.day);
  return ymdToDateString(sat.year, sat.month, sat.day);
}

/**
 * Determine which pay run a new submission belongs to.
 * Standard: before Friday 11:59 PM = current period; after = next period.
 * Friday close: extends into Monday noon of the following week for the previous period.
 */
export function determinePayRunForSubmission(now: Date = new Date(), isFridayClose = false): {
  periodStart: string;
  isLate: boolean;
} {
  const p = getPhoenixParts(now);
  const currentSat = getMostRecentSaturdayYMD(p.year, p.month, p.day);

  if (!isFridayClose) {
    if (isBeforeSubmissionDeadline(now)) {
      return { periodStart: getCurrentPayRunPeriod(now).periodStart, isLate: false };
    }
    return { periodStart: getNextPayRunPeriod(now).periodStart, isLate: true };
  }

  // Friday close: check if previous period's exception window is still open
  const prevSat = addCalendarDaysYMD(currentSat.year, currentSat.month, currentSat.day, -7);
  const prevFridayCloseCutoff = getFridayCloseExceptionCutoffInstant(prevSat);

  if (now.getTime() < prevFridayCloseCutoff.getTime()) {
    return { periodStart: ymdToDateString(prevSat.year, prevSat.month, prevSat.day), isLate: false };
  }

  // Standard window check for current period
  const standardCutoff = getSubmissionCutoffExclusiveInstant(currentSat);
  if (now.getTime() < standardCutoff.getTime()) {
    return { periodStart: getCurrentPayRunPeriod(now).periodStart, isLate: true };
  }

  return { periodStart: getNextPayRunPeriod(now).periodStart, isLate: true };
}

export function determinePayRunForRevision(originalPeriodStart: string | null, now: Date = new Date()): {
  periodStart: string;
  isLateRevision: boolean;
  rolled: boolean;
} {
  if (!originalPeriodStart) {
    return { periodStart: getCurrentPayRunPeriod(now).periodStart, isLateRevision: false, rolled: false };
  }

  const s = parsePeriodStart(originalPeriodStart);
  const revCutoff = getRevisionCutoffExclusiveInstant(s);

  if (now.getTime() < revCutoff.getTime()) {
    return { periodStart: originalPeriodStart, isLateRevision: false, rolled: false };
  }

  const nextPeriod = getNextPayRunPeriod(now);
  return { periodStart: nextPeriod.periodStart, isLateRevision: true, rolled: true };
}
