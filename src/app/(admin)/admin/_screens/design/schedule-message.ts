import { firstNameOf } from "@/lib/admin/people"
import { dateMovedText } from "@/sms/texts"
import type { GridBlock } from "@/components/blocks/time-grid-model"
import type { Place } from "./schedule-prototype-model"

// The text Notify the customer opens with (docs/plans/2026-11-25-scheduler-holistic-audit.md, row 7): the product's own `date-moved` text, built by `dateMovedText` (src/sms/texts.ts) from the saved
// "Day moved, text" words through `fillTemplate` with its real placeholders: the service, the day, the time, who is coming, and the signed link to that visit's page ("Doesn't work? Pick another day:").
// A move that kept the day and changed the time says "still ... now at ..." as the product does. The opt-out line is the dialog's (first text to that number only). Pure.

const ORIGIN = "https://www.trailheadirrigation.com"
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`

/** "Trailhead: your spring turn-on moved to Thu, Nov 26 at 9:00 am. Doesn't work? Pick another day: https://..." */
export function moveMessage(b: Pick<GridBlock, "id" | "service" | "day" | "start" | "title" | "town">, o: { customer: string; personName?: string; was?: Pick<Place, "day" | "start"> }): string {
  const sameDay = Boolean(o.was && o.was.day === b.day && b.start !== null && o.was.start !== b.start)
  return dateMovedText(
    {
      origin: ORIGIN,
      firstName: firstNameOf(o.customer) ?? o.customer,
      accountUrl: `${ORIGIN}/account`,
      signInUrl: `${ORIGIN}/account/sign-in`,
      visit: { id: b.id, name: b.service.charAt(0).toLowerCase() + b.service.slice(1), day: b.day, startTime: b.start === null ? null : hhmm(b.start), who: o.personName ? (firstNameOf(o.personName) ?? o.personName) : null, address: b.title, location: `${b.title}, ${b.town}`, icsUrl: `${ORIGIN}/api/visits/${b.id}.ics`, visitUrl: `${ORIGIN}/account/visits/${b.id}?t=prototype`, sameDay },
    },
    { optOut: false },
  )
}

