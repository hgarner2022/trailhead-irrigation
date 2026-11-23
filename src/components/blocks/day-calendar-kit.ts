import type { BoundFunctions, queries } from "@testing-library/dom"
import { clock12 } from "@/lib/booking/day-time"
import { longDay } from "@/lib/portal/words"

// How a unit test or a story's play function drives the one `DayCalendar`: press a day by its date (the month arrows are walked to it), press a start time by its "HH:MM", read which day is held.
// Everything goes by the names a person (or a screen reader) hears, so a screen that swaps its own day box for the calendar keeps its test sentences. Nothing here imports a test runner:
// the caller hands in its own `userEvent` (the unit tests' or Storybook's).

type Scope = BoundFunctions<typeof queries>
interface User {
  click: (element: Element) => Promise<void>
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
const monthOfGrid = (scope: Scope) => {
  const [, month, year] = /([A-Z][a-z]+) (\d{4})$/.exec(scope.getByRole("grid").getAttribute("aria-label") ?? "") ?? []
  return `${year}-${String(MONTHS.indexOf(month!) + 1).padStart(2, "0")}`
}

/** The button of a day, by its words ("Wednesday, November 25"), on the month the calendar shows; null when another month is showing. */
export const dayButton = (scope: Scope, day: string) => scope.queryByRole("button", { name: new RegExp(`^${longDay(day)}(,|$)`) })

/** Press a day: walks the month arrows to it first. A day that cannot be chosen is pressed all the same, and nothing happens, as it would for a person. */
export async function pickDay(scope: Scope, user: User, day: string) {
  for (let i = 0; i < 36 && !dayButton(scope, day); i++) await user.click(scope.getByRole("button", { name: monthOfGrid(scope) < day.slice(0, 7) ? "Next month" : "Previous month" }))
  await user.click(dayButton(scope, day)!)
}

/** Press a start time ("09:00" or "Any time"). */
export const pickTime = (scope: Scope, user: User, start: string | null) => user.click(scope.getByRole("radio", { name: start === null ? "Any time" : clock12(start) }))

/** The start time held, as the chip's words ("9:00 am", "Any time"), or null when none is held. */
export const heldTime = (scope: Scope): string | null => scope.queryAllByRole("radio").find((r) => (r as HTMLInputElement).checked)?.closest("label")?.textContent ?? null

const monthNameOfGrid = (scope: Scope) => /([A-Z][a-z]+)$/.exec(scope.getByRole("grid").getAttribute("aria-label") ?? "")?.[1]

/** Press a day on a year-less calendar ("09-28" is "September 28"): walks the month arrows to the month first. */
export async function pickMonthDay(scope: Scope, user: User, monthDay: string) {
  const month = MONTHS[Number(monthDay.slice(0, 2)) - 1]!
  const button = () => scope.queryByRole("button", { name: new RegExp(`^${month} ${Number(monthDay.slice(3, 5))}(,|$)`) })
  for (let i = 0; i < 12 && !button(); i++) await user.click(scope.getByRole("button", { name: MONTHS.indexOf(monthNameOfGrid(scope)!) < MONTHS.indexOf(month) ? "Next month" : "Previous month" }))
  await user.click(button()!)
}
