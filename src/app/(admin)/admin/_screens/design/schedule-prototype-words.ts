/** "2026-11-23" gives "Nov 23" (the plan strip's "week of Nov 23"). */
export const shortDay = (day: string): string => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
