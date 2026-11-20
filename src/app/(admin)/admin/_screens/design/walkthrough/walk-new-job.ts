import type { AdminData, Client } from "@/lib/admin/types"
import { SERVICE_LIST } from "@/lib/services"
import type { GridJob } from "../JobsGridDesign"
import { visitsData, VISITS_TODAY } from "../../visits-fixture"
import type { NewPassInput, NewVisitInput, VisitActions } from "../../visit-actions-types"
import { markActiveAgain, registerJob } from "./jobs-data"
import { customerPage } from "./data"
import { walkQuotes } from "../quotes/quote-store"
import { setLanding } from "./WalkRequests"
import type { QuoteJob } from "../quotes/quote-model"
import { REQUESTS_NOW } from "../requests/request-model"

// What the real New job sheet (`_screens/NewJob.tsx`) needs, as fixtures: the walkthrough's three customers for the type-ahead, the site's service
// catalogue, the people for Who, and two server actions stubbed to make a row in the prototype's Jobs grid. A new job is Unscheduled (or Scheduled
// when a day was chosen) and opens its own page; a sold pass is a Season Pass row.

export const WALK_TODAY = VISITS_TODAY

const client = (id: string, firstName: string, lastName: string, address: string, town: Client["town"], phone: string, email: string, hasPass: boolean): Client => ({ id, firstName, lastName, address, town, phone, email, jobberUrl: "", hasPass, app: true })
export const WALK_CLIENTS: Client[] = [
  client("andrea", "Andrea", "Dalton", "480 Briggs St", "Erie", "(970) 555-0123", "andrea.dalton@example.com", true),
  client("marcus", "Marcus", "Bell", "91 Main St", "Longmont", "(970) 555-0188", "marcus.bell@example.com", false),
  client("dale", "Dale", "Whitaker", "212 Main St", "Lafayette", "(970) 555-0140", "dale.whitaker@example.com", true),
  client("priya", "Priya", "Nair", "77 Aspen Way", "Firestone", "(970) 555-0123", "priya.nair@example.com", false),
  client("hal", "Hal", "Reed", "41 Cottonwood Dr", "Erie", "(970) 555-0123", "hal.reed@example.com", false),
  client("ivy", "Ivy", "Lund", "9 Meadow Ln", "Louisville", "(970) 555-0123", "ivy.lund@example.com", false),
  client("gus", "Gus", "Pratt", "70 Ridge Rd", "Lafayette", "(970) 555-0123", "gus.pratt@example.com", false),
]

/** The sheet's data: the repo's fixture (settings, people, services) with this world's customers. */
export const WALK_DATA: AdminData = { ...visitsData, clients: WALK_CLIENTS }

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
let seq = 0

function whoFor(customerId?: string, fresh?: NewVisitInput["newCustomer"]) {
  if (fresh) return { name: `${fresh.firstName} ${fresh.lastName}`.trim(), property: `${fresh.property.address}, ${fresh.property.town}` }
  const c = WALK_CLIENTS.find((x) => x.id === customerId)
  return { name: c ? `${c.firstName} ${c.lastName}` : "New customer", property: c ? `${c.address}, ${c.town}` : "" }
}

/** New work for an archived customer brings them back (docs/plans/2026-11-20 customer status: "New work brings them back"): no archive date, status read again, and the caller says so. */
function bringBack(customerId: string | undefined, onActiveAgain?: (name: string) => void) {
  const page = customerId ? customerPage(customerId) : null
  if (!customerId || page?.status !== "archived") return
  markActiveAgain(customerId)
  onActiveAgain?.(page.name)
}

/** A job is named by its service: the catalogue's "Sprinkler repair visit" is a job called "Sprinkler repair". */
const jobName = (name?: string) => name?.replace(/ visit$/, "")

/** The two actions the sheet calls: they make a row and answer its id, as the API would. */
export function makeNewJobActions(onMade: () => void, onActiveAgain?: (name: string) => void): VisitActions {
  const actions = {
    createVisit: async (input: NewVisitInput) => {
      const service = SERVICE_LIST.find((s) => s.key === input.serviceKey)
      const { name, property } = whoFor(input.customerId, input.newCustomer)
      bringBack(input.customerId, onActiveAgain)
      // Hannah, Nov 20 2026: a service with no catalogue price is quoted first, and "Add and send a quote" quotes any service. Either way the job opens as Needs
      // a quote with no day, in the quote store, and its page opens on the next step (price the line, or Send a quote once the line has a price).
      const quote = Boolean(input.sendQuote) || (service !== undefined && service.price === undefined)
      const id = quote ? `q-new-${++seq}` : `new-${++seq}`
      const title = jobName(service?.name) ?? "Job"
      if (quote) {
        const c = WALK_CLIENTS.find((x) => x.id === input.customerId)
        const fresh = input.newCustomer
        const [first = "", ...rest] = name.split(" ")
        const job: QuoteJob = {
          jobId: id,
          customerId: input.customerId ?? `new-${first}-${rest.join("-")}`.toLowerCase(),
          customer: name,
          first,
          phone: c?.phone ?? fresh?.phone ?? "",
          email: c?.email ?? fresh?.email ?? "",
          contact: "text",
          service: jobName(service?.name) ?? "Job",
          street: c?.address ?? fresh?.property.address ?? "",
          town: c?.town ?? fresh?.property.town ?? "",
          lines: [{ id: "l1", name: jobName(service?.name) ?? "Job", amount: input.price ?? 0 }],
          quotes: [],
          history: [{ at: REQUESTS_NOW, actor: "Ryan", what: "Job added by the office" }],
        }
        walkQuotes.add(job)
        registerJob({ id, name, service: job.service, title, property, stage: "needs-a-quote", who: "No one yet", season: "", visits: "0 of 1 done", total: input.price ?? 0, billingState: null, billing: "", next: "Unscheduled" })
        if (input.sendQuote) setLanding(id, input.price ? "send" : "price")
        onMade()
        return { ok: true as const, data: { id: `v-${id}`, jobId: id } }
      }
      const row: GridJob = { id, name, service: jobName(service?.name) ?? "Sprinkler repair", title, property, stage: input.scheduledOn ? "scheduled" : "unscheduled", who: "No one yet", season: "", visits: "0 of 1 done", total: input.price ?? 0, billingState: null, billing: "", next: input.scheduledOn ? DAY.format(new Date(`${input.scheduledOn}T12:00:00Z`)) : "Unscheduled" }
      registerJob(row)
      onMade()
      return { ok: true as const, data: { id: `v-${id}`, jobId: id } }
    },
    sellPass: async (input: NewPassInput) => {
      const { name, property } = whoFor(input.customerId, input.newCustomer)
      bringBack(input.customerId, onActiveAgain)
      const id = `new-${++seq}`
      const number = `TH-2027-${String(100 + seq).padStart(4, "0")}`
      registerJob({ id, name, service: "Season Pass", title: `Season Pass ${number}`, property, stage: "scheduled", who: "No one yet", season: "2027", visits: "0 of 2 done", total: input.zones <= 8 ? 260 : 260 + (input.zones - 8) * 20, billingState: null, billing: "", next: "Unscheduled" })
      onMade()
      return { ok: true as const, data: { id, number, firstName: name.split(" ")[0] ?? "" } }
    },
  }
  return actions as unknown as VisitActions
}
