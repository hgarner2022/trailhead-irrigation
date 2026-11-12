/**
 * Display formatting shared by blocks and screens: month names and the two
 * date forms DESIGN.md allows, written out where there is room ("October 4")
 * and short in table cells ("Oct 4"). Money is `formatMoney` in ./metrics.
 * Dates are read from the ISO string's date prefix as-is; converting stored
 * times to Mountain time is the wiring phase's job.
 */

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export const monthName = (month: number) => MONTH_NAMES[month - 1]
export const monthShort = (month: number) => monthName(month).slice(0, 3)

/** "Oct 4" from an ISO date or datetime, for table cells and chips. */
export const shortDate = (iso: string) => `${monthShort(Number(iso.slice(5, 7)))} ${Number(iso.slice(8, 10))}`

/** "October 4" from an ISO date or datetime, where there is room. */
export const writtenDate = (iso: string) => `${monthName(Number(iso.slice(5, 7)))} ${Number(iso.slice(8, 10))}`
