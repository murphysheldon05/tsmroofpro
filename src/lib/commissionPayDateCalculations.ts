/**
 * Pay Date Calculation Utility for Commission Documents
 * 
 * Business Rule:
 * - If approved by Wednesday 4 PM MST → Paid on that Friday
 * - If approved after Wednesday 4 PM MST → Paid on next Friday
 */

/**
 * Calculate the scheduled Friday pay date based on approval time
 * @param approvalDate - The date/time when the commission was approved
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
  
  // Wednesday = 3, deadline is 4 PM (16:00)
  // Before deadline: Sun, Mon, Tue, or Wed before 4 PM
  const isBeforeDeadline = dayOfWeek < 3 || (dayOfWeek === 3 && hour < 16);
  
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
