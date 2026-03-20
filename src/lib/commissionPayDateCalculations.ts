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
