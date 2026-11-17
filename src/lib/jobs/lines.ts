// What a job is made of: one line per sold thing, copied from the service at
// the sale so a later catalogue edit never rewrites an old job. Pure: the
// writers (checkout, the office pass sale, New visit) build lines here and
// insert them beside the visits; migration 0014 backfills the same names.
import { passVisits, visitPrice, type SeasonPassVisit } from "@/lib/season-pass"
import { serviceFor, SERVICE_LIST, type ServiceKind } from "@/lib/services"

/** A line as the writers build it and the readers total it; the row adds its ids. */
export interface Line {
  name: string
  /** what the visit includes, from the service at the sale */
  description?: string | null
  quantity: number
  /** whole dollars */
  unitPrice: number
  taxable: boolean
  /** the catalogue service the line was priced from, when one fits */
  serviceKey?: string
  /** the visit the line is billed after; the writer attaches the visit id once the visit row exists */
  visitKind?: ServiceKind
  cancelledAt?: Date | null
}

/** The line names the backfill uses for the same kinds; the rest take the catalogue name. */
const LINE_NAMES: Partial<Record<ServiceKind, string>> = {
  "turn-on": "Spring turn-on",
  inspection: "Mid-season inspection",
  blowout: "Fall blowout",
  repair: "Repair",
  install: "Installation",
  other: "Other",
}

function catalogue(kind: ServiceKind, zones: number) {
  return serviceFor(kind, zones) ?? SERVICE_LIST.find((s) => s.kind === kind)
}

function lineForVisit(visit: SeasonPassVisit, zones: number): Line {
  const service = catalogue(visit.key, zones)
  return { name: LINE_NAMES[visit.key]!, description: service?.description, quantity: 1, unitPrice: visitPrice(visit, zones), taxable: false, serviceKey: service?.key, visitKind: visit.key }
}

/** The lines of a Season Pass: one per visit, in season order, priced per zone from `season-pass.ts`, never taxed. */
export function linesForPass(zones: number, inspection: boolean): Line[] {
  return passVisits(inspection).map((visit) => lineForVisit(visit, zones))
}

/** One line for a visit of a kind at a price: Repair, Installation, the pass visit names, or the catalogue name. */
export function lineForVisitKind(kind: ServiceKind, price: number, zones = 0): Line {
  const service = catalogue(kind, zones)
  return { name: LINE_NAMES[kind] ?? service?.name ?? "Other", description: service?.description, quantity: 1, unitPrice: price, taxable: false, serviceKey: service?.key, visitKind: kind }
}

/** What the line adds to the job: quantity times the unit price, nothing once cancelled. */
export function lineTotal(line: Pick<Line, "quantity" | "unitPrice" | "cancelledAt">): number {
  return line.cancelledAt ? 0 : line.quantity * line.unitPrice
}

/** What the job comes to, cancelled lines left out. */
export function jobTotal(lines: readonly Pick<Line, "quantity" | "unitPrice" | "cancelledAt">[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0)
}
