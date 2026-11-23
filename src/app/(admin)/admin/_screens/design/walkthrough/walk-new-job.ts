import type { AdminData, Client } from "@/lib/admin/types"
import { SERVICE_LIST } from "@/lib/services"
import type { GridJob } from "../JobsGridDesign"
import { visitsData, VISITS_TODAY } from "../../visits-fixture"
import type { NewPassInput, NewVisitInput, VisitActions } from "../../visit-actions-types"
import { newCustomerFrom, type CustomerChoice } from "../../CustomerPicker"
import { customerIdOf, markActiveAgain, registerJob } from "./jobs-data"
import { registerWorldCustomer, WORLD_CUSTOMERS } from "./world-customers"
import { customerPage } from "./data"

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

/** Everyone else of the world is on the sheet's type-ahead too, so a job can be made for any customer a chip opens. */
for (const [id, w] of Object.entries(WORLD_CUSTOMERS)) {
  const [first = "", ...rest] = w.name.split(" ")
  WALK_CLIENTS.push(client(id, first, rest.join(" "), w.street, w.town as Client["town"], w.phone, w.email, false))
}

/** The sheet's data: the repo's fixture (settings, people, services) with this world's customers. */
export const WALK_DATA: AdminData = { ...visitsData, clients: WALK_CLIENTS }

const DAY = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
let seq = 0

function whoFor(customerId?: string, fresh?: NewVisitInput["newCustomer"]) {
  if (fresh) {
    // a person made here has a customer page from the moment their job exists: their contact details and property are kept for it
    const name = `${fresh.firstName} ${fresh.lastName}`.trim()
    registerWorldCustomer(customerIdOf(name), { name, phone: fresh.phone ?? "", email: fresh.email ?? "", channel: fresh.email && !fresh.phone ? "email" : "text", street: fresh.property.address, town: fresh.property.town, since: "2026-11-20" })
    return { name, property: `${fresh.property.address}, ${fresh.property.town}` }
  }
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
      // Hannah, Nov 22 2026: a job made here is always real work: a quote is made by New quote, and its job exists only once it is approved
      const id = `new-${++seq}`
      const title = jobName(service?.name) ?? "Job"
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

/** The customer a quote made by hand is for: the client Ryan chose, or a new person typed into the sheet, who joins the world as one made by New job does. */
export function partyOfChoice(choice: CustomerChoice) {
  const fresh = choice.isNew ? newCustomerFrom(choice.person) : undefined
  const { name } = whoFor(choice.isNew ? undefined : choice.chosen, fresh)
  const client = choice.isNew ? undefined : WALK_CLIENTS.find((x) => x.id === choice.chosen)
  const phone = client?.phone ?? fresh?.phone ?? ""
  const email = client?.email ?? fresh?.email ?? ""
  return {
    customerId: client ? client.id : customerIdOf(name),
    customer: name,
    first: name.split(" ")[0] ?? "",
    phone,
    email,
    contact: (email && !phone ? "email" : "text") as "text" | "email",
    street: client?.address ?? fresh?.property.address ?? "",
    town: client?.town ?? fresh?.property.town ?? "",
  }
}
