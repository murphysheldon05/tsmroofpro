/**
 * Pay Date Calculation Utility for Commission Submissions
 * 
 * Business Rule (Tuesday 3:00 PM MST cutoff):
 * - Submitted/approved by Tuesday 3:00 PM MST → This week's Friday pay run
 * - Submitted/approved after Tuesday 3:00 PM MST → Next week's Friday pay run
 * 
 * Reps can ALWAYS submit; pay run is assigned automatically based on submission timestamp.
 */

/**
 * Calculate the scheduled Friday pay date based on a timestamp (submission or approval).
 * Uses MST timezone for the cutoff calculation.
 * @param timestamp - The date/time (e.g. submission time or approval time)
 * @returns The calculated Friday pay date
 */
export function calculateScheduledPayDate(approvalDate: Date): Date {
  // MST is UTC-7 (standard time) or UTC-6 (daylight saving)
  // We'll use UTC-7 for consistency as MST doesn't observe DST
  const mstOffset = -7 * 60; // minutes
  
  // Convert to MST
  const utcTime = approvalDate.getTime() + (approvalDate.getTimezoneOffset() * 60000);
  const mstTime = new Date(utcTime + (mstOffset * 60000));
  
  const dayOfWeek = mstTime.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const hour = mstTime.getHours();
  
  // Tuesday = 2, deadline is 3 PM (15:00)
  // Before deadline: Sun, Mon, or Tue before 3 PM
  const isBeforeDeadline = dayOfWeek < 2 || (dayOfWeek === 2 && hour < 15);
  
  // Calculate days until Friday (day 5)
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  
  // If it's Friday, we need to go to the next Friday
  if (daysUntilFriday === 0) {
    daysUntilFriday = 7;
  }
  
  // If after deadline, push to next week's Friday
  if (!isBeforeDeadline) {
    daysUntilFriday += 7;
  }
  
  // Calculate the pay date (in MST, but we'll return as a date object)
  const payDate = new Date(mstTime);
  payDate.setDate(payDate.getDate() + daysUntilFriday);
  
  // Reset to midnight for clean date
  payDate.setHours(0, 0, 0, 0);
  
  return payDate;
}

/**
 * Format a date for display
 * @param date - The date to format
 * @returns Formatted string like "Friday, January 31, 2026"
 */
export function formatPayDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format a date in short form
 * @param date - The date to format
 * @returns Formatted string like "Friday, Jan 31"
 */
export function formatPayDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Get the estimated pay date for a commission that hasn't been accounting approved yet
 * This is used for manager-approved commissions to show an estimated pay date
 * @returns The next possible Friday based on current time
 */
export function getEstimatedPayDate(): Date {
  return calculateScheduledPayDate(new Date());
}

/**
 * Get the scheduled pay date as YYYY-MM-DD string for database storage.
 * Used when assigning pay run at commission submission time.
 */
export function getScheduledPayDateString(timestamp: Date): string {
  const d = calculateScheduledPayDate(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Helpers for MST time conversion ──────────────────────────
function toMST(date: Date): Date {
  const mstOffset = -7 * 60;
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utcTime + (mstOffset * 60000));
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Get this week's Friday as a YYYY-MM-DD string (MST-based).
 */
function getThisWeekFriday(): string {
  const mst = toMST(new Date());
  const day = mst.getDay();
  let daysUntilFriday = (5 - day + 7) % 7;
  if (daysUntilFriday === 0 && mst.getDay() === 5) daysUntilFriday = 0;
  if (daysUntilFriday === 0 && mst.getDay() !== 5) daysUntilFriday = 7;
  const fri = new Date(mst);
  fri.setDate(fri.getDate() + daysUntilFriday);
  return toDateString(fri);
}

/**
 * Calculate the pay date for a resubmitted commission (after rejection).
 *
 * Grace-period rule:
 *   If the commission was originally eligible for this week's pay run
 *   (existing scheduled_pay_date is this week's Friday) AND the resubmission
 *   happens before Wednesday 12:00 PM MST, the same-week pay date is preserved.
 *   Otherwise a fresh calculation is performed (likely pushing to next week).
 */
export function calculateResubmissionPayDate(
  existingPayDate: string | null
): string {
  if (!existingPayDate) {
    return getScheduledPayDateString(new Date());
  }

  const mst = toMST(new Date());
  const dayOfWeek = mst.getDay();
  const hour = mst.getHours();

  const thisWeekFri = getThisWeekFriday();
  const isBeforeWednesdayNoon = dayOfWeek < 3 || (dayOfWeek === 3 && hour < 12);
  const wasThisWeek = existingPayDate === thisWeekFri;

  if (wasThisWeek && isBeforeWednesdayNoon) {
    return existingPayDate;
  }

  return getScheduledPayDateString(new Date());
}

/**
 * Get display-friendly deadline info for the current pay cycle.
 *
 * Example: Week of March 23
 *   Submission cutoff → Tuesday, Mar 24 at 3:00 PM MST
 *   Revision grace    → Wednesday, Mar 25 at 12:00 PM MST
 *   Pay run           → Friday, Mar 27
 */
export function getCurrentDeadlineInfo(): {
  submissionDeadline: string;
  revisionDeadline: string;
  payDate: string;
} {
  const mst = toMST(new Date());
  const day = mst.getDay();
  const hour = mst.getHours();

  // Find the next relevant Tuesday cutoff.
  // If we haven't passed Tuesday 3PM yet, use this week's Tuesday.
  // If we have, use next week's Tuesday.
  const isBeforeCutoff = day < 2 || (day === 2 && hour < 15);
  let daysToTuesday: number;
  if (isBeforeCutoff) {
    daysToTuesday = 2 - day;
  } else {
    daysToTuesday = ((2 - day + 7) % 7) || 7;
  }

  const tue = new Date(mst);
  tue.setDate(tue.getDate() + daysToTuesday);
  tue.setHours(15, 0, 0, 0);

  // Wednesday noon = Tuesday + 1 day
  const wed = new Date(tue);
  wed.setDate(wed.getDate() + 1);
  wed.setHours(12, 0, 0, 0);

  // Pay date = Friday of the same week = Tuesday + 3 days
  const fri = new Date(tue);
  fri.setDate(fri.getDate() + 3);

  return {
    submissionDeadline: tue.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + " at 3:00 PM MST",
    revisionDeadline: wed.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + " at 12:00 PM MST",
    payDate: formatPayDateShort(fri),
  };
}

// ═══════════════════════════════════════════════════════════════
// Period-based pay run helpers (Saturday–Friday cycle)
// ═══════════════════════════════════════════════════════════════

export interface PayRunPeriod {
  periodStart: string;   // YYYY-MM-DD Saturday
  periodEnd: string;     // YYYY-MM-DD Friday
  submissionDeadline: Date; // Tuesday 3PM MST as UTC Date
  revisionDeadline: Date;   // Wednesday noon MST as UTC Date
  submissionDeadlineDisplay: string;
  revisionDeadlineDisplay: string;
}

/**
 * Get the current pay run's Saturday start date (most recent Saturday at midnight MST).
 * Pay run week: Saturday 12:00 AM MST through Friday 11:59 PM MST.
 */
function getMostRecentSaturday(mst: Date): Date {
  const dow = mst.getDay(); // 0=Sun .. 6=Sat
  const daysSinceSat = (dow + 1) % 7; // Sat=0, Sun=1, Mon=2 ...
  const sat = new Date(mst);
  sat.setDate(sat.getDate() - daysSinceSat);
  sat.setHours(0, 0, 0, 0);
  return sat;
}

export function getCurrentPayRunPeriod(): PayRunPeriod {
  const mst = toMST(new Date());
  const sat = getMostRecentSaturday(mst);
  return buildPayRunPeriod(sat);
}

export function getNextPayRunPeriod(): PayRunPeriod {
  const mst = toMST(new Date());
  const sat = getMostRecentSaturday(mst);
  const nextSat = new Date(sat);
  nextSat.setDate(nextSat.getDate() + 7);
  return buildPayRunPeriod(nextSat);
}

function buildPayRunPeriod(saturdayMST: Date): PayRunPeriod {
  const fri = new Date(saturdayMST);
  fri.setDate(fri.getDate() + 6);

  // Tuesday = Saturday + 3 days, 3 PM MST
  const tue = new Date(saturdayMST);
  tue.setDate(tue.getDate() + 3);
  tue.setHours(15, 0, 0, 0);

  // Wednesday = Saturday + 4 days, noon MST
  const wed = new Date(saturdayMST);
  wed.setDate(wed.getDate() + 4);
  wed.setHours(12, 0, 0, 0);

  return {
    periodStart: toDateString(saturdayMST),
    periodEnd: toDateString(fri),
    submissionDeadline: tue,
    revisionDeadline: wed,
    submissionDeadlineDisplay:
      tue.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + " at 3:00 PM MST",
    revisionDeadlineDisplay:
      wed.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) + " at 12:00 PM MST",
  };
}

/**
 * Check if the current time (MST) is on or before the Tuesday 3:00 PM submission deadline.
 * Exactly 3:00:00 PM = ON TIME (edge case #1).
 */
export function isBeforeSubmissionDeadline(): boolean {
  const mst = toMST(new Date());
  const dow = mst.getDay();
  const hour = mst.getHours();
  const min = mst.getMinutes();
  const sec = mst.getSeconds();

  // Saturday(6), Sunday(0), Monday(1) → always before deadline
  if (dow === 6 || dow === 0 || dow === 1) return true;
  // Tuesday(2) at exactly 15:00:00 or before
  if (dow === 2) return hour < 15 || (hour === 15 && min === 0 && sec === 0);
  // Wed, Thu, Fri → past deadline
  return false;
}

/**
 * Check if the current time (MST) is on or before the Wednesday 12:00 PM revision deadline.
 * Exactly 12:00:00 PM = ON TIME (edge case #2).
 */
export function isBeforeRevisionDeadline(): boolean {
  const mst = toMST(new Date());
  const dow = mst.getDay();
  const hour = mst.getHours();
  const min = mst.getMinutes();
  const sec = mst.getSeconds();

  // Saturday(6), Sunday(0), Monday(1), Tuesday(2) → always before revision deadline
  if (dow === 6 || dow === 0 || dow === 1 || dow === 2) return true;
  // Wednesday(3) at exactly 12:00:00 or before
  if (dow === 3) return hour < 12 || (hour === 12 && min === 0 && sec === 0);
  // Thu, Fri → past deadline
  return false;
}

/**
 * Format a pay run period as a display range: "Mar 22 – Mar 28"
 */
export function formatPayRunRange(periodStart: string, periodEnd: string): string {
  const start = new Date(periodStart + "T00:00:00");
  const end = new Date(periodEnd + "T00:00:00");
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Get countdown to the Tuesday 3:00 PM MST submission deadline.
 * Returns null if the deadline has passed for this pay run.
 */
export function getDeadlineCountdown(): { hours: number; minutes: number; totalMs: number } | null {
  const now = toMST(new Date());
  const period = getCurrentPayRunPeriod();
  const deadline = period.submissionDeadline;

  const diff = deadline.getTime() - now.getTime();
  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes, totalMs: diff };
}

/**
 * Format a UTC timestamp for display in MST.
 * Returns format like "Mar 25, 2026 at 2:47 PM MST"
 */
export function formatTimestampMST(isoString: string): string {
  const date = new Date(isoString);
  const mst = toMST(date);
  const monthDay = mst.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = mst.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${monthDay} at ${time} MST`;
}

/**
 * Compute the Saturday-based period_start for a given Date, used for
 * determining which pay run to assign to.
 */
export function getPeriodStartForDate(date: Date): string {
  const mst = toMST(date);
  const sat = getMostRecentSaturday(mst);
  return toDateString(sat);
}

/**
 * Determine which pay run period_start a new submission should be assigned to,
 * and whether it is a late submission.
 */
export function determinePayRunForSubmission(): {
  periodStart: string;
  isLate: boolean;
} {
  if (isBeforeSubmissionDeadline()) {
    return { periodStart: getCurrentPayRunPeriod().periodStart, isLate: false };
  }
  return { periodStart: getNextPayRunPeriod().periodStart, isLate: true };
}

/**
 * Determine which pay run a revision resubmission should be assigned to.
 * If the original pay run matches the current period and we're before Wednesday noon,
 * keep it in the same pay run; otherwise roll to next.
 */
export function determinePayRunForRevision(originalPeriodStart: string | null): {
  periodStart: string;
  isLateRevision: boolean;
  rolled: boolean;
} {
  const currentPeriod = getCurrentPayRunPeriod();

  if (originalPeriodStart === currentPeriod.periodStart && isBeforeRevisionDeadline()) {
    return { periodStart: originalPeriodStart, isLateRevision: false, rolled: false };
  }

  const nextPeriod = getNextPayRunPeriod();
  return { periodStart: nextPeriod.periodStart, isLateRevision: true, rolled: true };
}
