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
