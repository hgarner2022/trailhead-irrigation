import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { VisitKind } from "@/lib/admin/types"
import { SERVICE_LIST, serviceFor, type ServiceKind } from "@/lib/services"
import { monthDayOfDate, inBookableWindow, windowWords, type BookableWindow } from "@/lib/services-window"

// What the walkthrough's Settings holds that the Schedule reads (docs/plans/2026-11-25-scheduler-holistic-audit.md, row 27): the minutes of each service from Services (the catalogue,
// `src/lib/services.ts`), "Most per day" from People (`WALK_PEOPLE.capacityByKind`, read by the engine) and each kind's dates (`settings.windows`, the one truth for dates until the engine
// reads the services' own). Pure.

const FALLBACK: Record<VisitKind, number> = { "turn-on": 60, inspection: 90, blowout: 30, repair: 60, install: 120, other: 120 }

/** The minutes Services gives a visit of this kind (a six zone yard), else the old default. */
export function serviceMinutes(kind: VisitKind, zones = 6): number {
  return serviceFor(kind as ServiceKind, zones)?.slotMinutes ?? SERVICE_LIST.find((s) => s.kind === kind)?.slotMinutes ?? FALLBACK[kind]
}

interface Window { kind: string; opensOn: string; closesOn: string }

/** The dates of a kind as the service's span, "MM-DD" each; empty (all year) for a kind with no window. */
export function datesOf(kind: string): BookableWindow {
  const w = (snapshot.settings.windows as Window[]).find((x) => x.kind === kind)
  return w ? { bookableFrom: monthDayOfDate(w.opensOn), bookableTo: monthDayOfDate(w.closesOn) } : {}
}

/** "Apr 15 to May 31", the words of a kind's dates; null for a kind open all year. */
export function datesWords(kind: string): string | null {
  const d = datesOf(kind)
  return d.bookableFrom || d.bookableTo ? windowWords(d) : null
}

/** The note for a day outside the kind's dates; null inside them. A note, not a refusal: the office may book any day. */
export const outsideDates = (kind: string, day: string): string | null => {
  const words = datesWords(kind)
  return words && !inBookableWindow(datesOf(kind), day) ? `Outside the dates for this service, ${words}.` : null
}
