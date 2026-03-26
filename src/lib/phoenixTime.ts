/**
 * America/Phoenix wall time and instants (UTC stored in DB; display/cutoffs in Phoenix).
 * Arizona does not observe DST — offset is UTC−7 year-round.
 */

export const PHOENIX_TZ = "America/Phoenix";

/** Phoenix local calendar parts for an instant. */
export function getPhoenixParts(date: Date): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  hour: number;
  minute: number;
  second: number;
} {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: PHOENIX_TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const wk = map.weekday;
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: weekdayMap[wk] ?? 0,
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * Convert Phoenix wall-clock local time to a UTC Date (instant).
 * America/Phoenix is always UTC−7 (no DST).
 */
export function phoenixWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms = 0
): Date {
  const utcMs = Date.UTC(year, month - 1, day, hour + 7, minute, second, ms);
  return new Date(utcMs);
}

/** YYYY-MM-DD in Phoenix for an instant. */
export function toPhoenixDateString(date: Date): string {
  const p = getPhoenixParts(date);
  const m = String(p.month).padStart(2, "0");
  const d = String(p.day).padStart(2, "0");
  return `${p.year}-${m}-${d}`;
}

/**
 * Most recent Saturday (calendar) on or before the given Phoenix calendar day.
 */
export function getMostRecentSaturdayYMD(
  year: number,
  month: number,
  day: number
): { year: number; month: number; day: number } {
  const p = getPhoenixParts(phoenixWallToUtc(year, month, day, 12, 0, 0));
  const daysSinceSat = (p.weekday + 1) % 7;
  return addCalendarDaysYMD(p.year, p.month, p.day, -daysSinceSat);
}

export function addCalendarDaysYMD(
  year: number,
  month: number,
  day: number,
  deltaDays: number
): { year: number; month: number; day: number } {
  const anchor = phoenixWallToUtc(year, month, day, 12, 0, 0);
  const next = new Date(anchor.getTime() + deltaDays * 86400000);
  const p = getPhoenixParts(next);
  return { year: p.year, month: p.month, day: p.day };
}

/**
 * Tuesday 3:00:01 PM Phoenix instant — times strictly before this are "on time" for submission cutoff.
 */
export function getSubmissionCutoffExclusiveInstant(periodSaturday: {
  year: number;
  month: number;
  day: number;
}): Date {
  const tue = addCalendarDaysYMD(periodSaturday.year, periodSaturday.month, periodSaturday.day, 3);
  return phoenixWallToUtc(tue.year, tue.month, tue.day, 15, 0, 1);
}

/**
 * Wednesday 12:00:01 PM Phoenix instant — times strictly before this are "on time" for revision cutoff.
 */
export function getRevisionCutoffExclusiveInstant(periodSaturday: {
  year: number;
  month: number;
  day: number;
}): Date {
  const wed = addCalendarDaysYMD(periodSaturday.year, periodSaturday.month, periodSaturday.day, 4);
  return phoenixWallToUtc(wed.year, wed.month, wed.day, 12, 0, 1);
}

/** Format ISO instant for display in Phoenix (MST). */
export function formatInstantInPhoenixMST(isoString: string): string {
  const date = new Date(isoString);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    timeZone: PHOENIX_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: PHOENIX_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${monthDay} at ${time} MST`;
}
