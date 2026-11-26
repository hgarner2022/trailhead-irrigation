import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { RequestPage } from "./RequestPage"
import { RequestsHome } from "./RequestsHome"
import { RequestsList } from "./RequestsList"
import { RequestsShell } from "./RequestsShell"
import { REQUESTS_NOW, REQUEST_FIXTURES, listOrder, matchOf, type RequestData } from "./request-model"
import { fromSent } from "./request-store"
import type { RequestRow } from "@/components/blocks/RequestRows"

// Requests (Hannah, Nov 20 2026): someone who is not a customer asks for work that cannot be booked online. It waits here until Ryan makes something of it, even
// when the email matches a customer, so spam never becomes a customer. There are two ways out and the request MOVES into what it became: it leaves the list, there is
// no accepted state. Send a quote (Nov 22 2026) makes the customer and a quote in Draft, never a job: the job is made when the quote is approved. Create job, offered
// only for a service with a catalogue price, still makes a job at once. Archiving the quote archives the request. Each story says what Ryan sees. Pure screens over
// fixtures: nothing is wired.

const meta = {
  title: "Admin/Requests",
  component: RequestsList,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The Requests item in the left nav (after Schedule, with a count of new requests), the list of what has come in, a request's own page with the match panel and its Create job, Send a quote and Archive actions, Home's rows and Cmd+K's Requests group. A request is New, Seen or Archived; sending a quote makes a quote and moves the request out of the list (it comes back, Archived, when that quote is archived), and Create job, offered only for a priced service, makes a job at once. Click a name to open a request; both open a dialog that states the exact effect. The clickable version is Admin / Walkthrough (clickable).",
      },
    },
  },
} satisfies Meta<typeof RequestsList>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const HIDDEN = ["!dev", "!autodocs"]
const NOW = REQUESTS_NOW
const byId = (id: string): RequestData => REQUEST_FIXTURES.find((r) => r.id === id)!
const ALL = REQUEST_FIXTURES

const list = (rows: readonly RequestData[] = ALL, defaultFilters?: { column: string; values: string[] }[]) => (
  <RequestsShell list={rows}>
    <RequestsList requests={rows} now={NOW} onOpen={() => undefined} defaultFilters={defaultFilters} />
  </RequestsShell>
)
const page = (r: RequestData, o: Partial<React.ComponentProps<typeof RequestPage>> = {}) => (
  <RequestsShell>
    <RequestPage request={r} now={NOW} markSeenOnOpen={false} {...o} />
  </RequestsShell>
)

/** Ryan sees two new requests on top, then the ones he has looked at, then the archived ones. A request that became a job or a quote is not in the list. The name opens a request. */
export const List: Story = { name: "List", args: { requests: ALL, now: NOW, onOpen: () => undefined }, render: () => list(), globals: laptop }
export const ListPhone: Story = { name: "List, phone", args: List.args, render: () => list(), globals: phone }

/** The Status chip set to New, as the link from Home's row opens it. */
export const ListNewOnly: Story = { name: "List, New only", args: List.args, render: () => list(ALL, [{ column: "state", values: ["new"] }]), globals: laptop }

/** Nothing has come in: one line says where a request will show. */
export const ListEmpty: Story = { name: "List, nothing yet", args: List.args, render: () => list([]), globals: laptop }

/** A request the customer sent from the booking form's "Request a quote" path: New, first in the list, held outside Customers. */
const FROM_FORM = fromSent({ id: "rq-form", at: REQUESTS_NOW, first: "Sam", last: "Ito", phone: "(970) 555-0100", email: "sam.ito@example.com", contact: "text", street: "7 Oak St", town: "Erie", serviceKey: "lights", serviceName: "Christmas lights", words: "The roofline and two trees.", photos: [{ name: "a.jpg", src: "data:image/svg+xml;utf8,a" }] })
export const ListFromTheForm: Story = { name: "List, with a request from the booking form", args: { requests: ALL, now: NOW, onOpen: () => undefined }, render: () => list([FROM_FORM, ...ALL]), globals: laptop }

/** A request from a new person for Christmas lights, which has no catalogue price: New, "No match", Send a quote is the primary and Archive sits beside it (Create job is not offered for a service with no price). */
export const New: Story = { name: "New", args: List.args, render: () => page(byId("rq-rosa")), globals: laptop }
export const NewPhone: Story = { name: "New, phone", args: List.args, render: () => page(byId("rq-rosa")), globals: phone }

/** The email matches Andrea Dalton: the panel says so and the band's Customer tile opens her. The request still waits for Ryan. */
export const NewMatches: Story = { name: "New, matches a customer", args: List.args, render: () => page(byId("rq-andrea")), globals: laptop }
export const NewMatchesPhone: Story = { name: "New, matches a customer, phone", args: List.args, render: () => page(byId("rq-andrea")), globals: phone }
/** The booking form recognises a repeat customer by address only (Hannah, Nov 23 2026), so a request can come from a property we have under another email: it matches by address and Ryan is told the email differs. */
const sameAddress = () => ({ ...byId("rq-andrea"), id: "rq-address-only", email: "andrea@work.example.com", phone: "(970) 555-0999" })
export const NewAddressOnFile: Story = {
  name: "New, address on file, another email",
  args: List.args,
  render: () => page(sameAddress()),
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect((await c.findAllByText(/Same address/)).length).toBeGreaterThan(0)
    await expect((await c.findAllByText(/Email differs from the one on file/)).length).toBeGreaterThan(0)
  },
}
export const NewAddressOnFilePhone: Story = { name: "New, address on file, another email, phone", args: List.args, render: () => page(sameAddress()), globals: phone }

/** Opening a New request writes Seen once: the pill reads Seen. */
export const Opened: Story = { name: "Opened", args: List.args, render: () => <RequestsShell><RequestPage request={byId("rq-rosa")} now={NOW} /></RequestsShell>, globals: laptop }

/** Ryan has looked at it and not decided: Seen, with the same two actions. */
export const Seen: Story = { name: "Seen", args: List.args, render: () => page(byId("rq-kevin")), globals: laptop }

/** A priced service (a sprinkler repair, $145): Create job leads, because the job can be scheduled at once, and Send a quote is the outline. A service with no price has Send a quote only: a job that waits on a price is never made. */
export const SeenPriced: Story = { name: "Seen, a priced service", args: List.args, render: () => page(byId("rq-tom")), globals: laptop }
export const SeenPricedPhone: Story = { name: "Seen, a priced service, phone", args: List.args, render: () => page(byId("rq-tom")), globals: phone }

// The convert sheet (Hannah, Nov 21 2026, docs/plans/2026-11-21-request-conversion-research.md): Create job and Send a quote both open a sheet with the customer and a required
// "What is this for?" built from the booking catalogue and ending with Something else. It is chosen when the request named a catalogue service and empty when it did not.

/** A request with no service named (the list reads "Not said"): Ben Harlan with a real question in place of the spam he wrote in the fixture. */
const BEN: RequestData = { ...byId("rq-ben"), archived: undefined, seen: false, phone: "", email: "ben.harlan@example.com", contact: "text", street: "31 Maple Dr", town: "Lafayette", words: "A sprinkler head by the mailbox keeps popping off. Can someone take a look?" }

/** The sheet when the request named a catalogue service: Christmas lights is already chosen, the sentence states the exact effect, and the button is on. */
export const ConvertPreselected: Story = { name: "Convert sheet, service chosen", args: List.args, render: () => page(byId("rq-rosa"), { initialDialog: "quote" }), globals: laptop }
export const ConvertPreselectedPhone: Story = { name: "Convert sheet, service chosen, phone", args: List.args, render: () => page(byId("rq-rosa"), { initialDialog: "quote" }), globals: phone }

/** The sheet when the request named none: the picker is empty, the button is off and one quiet line says what is missing. */
export const ConvertEmpty: Story = { name: "Convert sheet, nothing chosen", args: List.args, render: () => page(BEN, { initialDialog: "quote" }), globals: laptop }
export const ConvertEmptyPhone: Story = { name: "Convert sheet, nothing chosen, phone", args: List.args, render: () => page(BEN, { initialDialog: "quote" }), globals: phone }

/** Something else: the list ends with it, it asks for the name of the job, and the quote has that name and no price. */
export const ConvertSomethingElse: Story = { name: "Convert sheet, something else", args: List.args, render: () => page(BEN, { initialDialog: "quote", initialPick: { key: "else", other: "" } }), globals: laptop }

/** The request named the larger repair and Ryan, who read the words, changes it to a sprinkler repair before he confirms: the sentence follows the choice. */
export const ConvertChanged: Story = { name: "Convert sheet, a wrong service being changed", args: List.args, render: () => page(byId("rq-kevin"), { initialDialog: "quote", initialPick: { key: "repair", other: "" } }), globals: laptop }
export const ConvertChangedPhone: Story = { name: "Convert sheet, a wrong service being changed, phone", args: List.args, render: () => page(byId("rq-kevin"), { initialDialog: "quote", initialPick: { key: "repair", other: "" } }), globals: phone }

/** Empty to chosen: the button is off until a choice is made, then the sentence names the service and the quote is made with it. */
export const ConvertEmptyTest: Story = {
  name: "Convert, nothing chosen (test)",
  tags: HIDDEN,
  args: List.args,
  render: () => page(BEN),
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Send a quote" }))
    const dialog = within(await within(document.body).findByRole("dialog"))
    await expect(dialog.getByRole("button", { name: "Send a quote" })).toBeDisabled()
    await expect(dialog.getByText("Choose what this is for.")).toBeInTheDocument()
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "What is this for?" }), "repair")
    await expect(dialog.getByText(/make a Sprinkler repair quote/)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Send a quote" }))
    await expect(await c.findByRole("heading", { level: 1, name: "This request became a quote" })).toBeInTheDocument()
  },
}

/** Preselected to changed: Kevin's request names the larger repair, Ryan picks another service and the sheet says the new one. */
export const ConvertChangeTest: Story = {
  name: "Convert, change the service (test)",
  tags: HIDDEN,
  args: List.args,
  render: () => page(byId("rq-kevin")),
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Send a quote" }))
    const dialog = within(await within(document.body).findByRole("dialog"))
    await expect(dialog.getByRole("combobox", { name: "What is this for?" })).toHaveValue("big-repair")
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "What is this for?" }), "repair")
    await expect(dialog.getByText(/make a Sprinkler repair quote/)).toBeInTheDocument()
    await expect(dialog.getByRole("button", { name: "Send a quote" })).toBeEnabled()
  },
}

/** Create job on a new person, for a priced service: the dialog states the exact effect, adds a customer and a job that is ready to schedule, and sends nothing. */
export const CreateJobNoMatch: Story = { name: "Create job, no match", args: List.args, render: () => page(byId("rq-tom"), { initialDialog: "job" }), globals: laptop }
export const CreateJobNoMatchPhone: Story = { name: "Create job, no match, phone", args: List.args, render: () => page(byId("rq-tom"), { initialDialog: "job" }), globals: phone }

/** Create job on a match: the job goes under the customer who matches, with a choice to add a new customer instead. */
export const CreateJobMatch: Story = { name: "Create job, a match", args: List.args, render: () => page(byId("rq-andrea"), { initialDialog: "job", initialPick: { key: "repair", other: "" } }), globals: laptop }

/** Create job on a service with no price: the sheet says "Needs a price. Use Send a quote." and the button stays off. */
export const CreateJobNeedsAPrice: Story = { name: "Create job, a service with no price", args: List.args, render: () => page(byId("rq-tom"), { initialDialog: "job", initialPick: { key: "lights", other: "" } }), globals: laptop }

/** Send a quote: the request moves into a quote in Draft (no job is made until it is approved) and Ryan lands on the quote to price and send. Nothing is sent to the customer yet. */
export const SendQuoteDialog: Story = { name: "Send a quote", args: List.args, render: () => page(byId("rq-rosa"), { initialDialog: "quote" }), globals: laptop }
export const SendQuoteDialogPhone: Story = { name: "Send a quote, phone", args: List.args, render: () => page(byId("rq-rosa"), { initialDialog: "quote" }), globals: phone }

/** Archive asks why: Spam, Question answered, Not a fit or Duplicate. No customer is added. */
export const ArchiveDialog: Story = { name: "Archive", args: List.args, render: () => page(byId("rq-rosa"), { initialDialog: "archive" }), globals: laptop }

/** A stale link to a request that became a quote: a plain page that says so, with the quote as a chip and its status. Never a dead end. */
export const BecameQuote: Story = { name: "This request became a quote", args: List.args, render: () => page(byId("rq-beth"), { quoteStage: { status: "quote-sent", label: "Sent" } }), globals: laptop }
export const BecameQuotePhone: Story = { name: "This request became a quote, phone", args: List.args, render: () => page(byId("rq-beth"), { quoteStage: { status: "quote-sent", label: "Sent" } }), globals: phone }

/** The quote was archived, so the request is archived with the same reason: its stale link says it became a quote that was archived. */
const BETH_ARCHIVED: RequestData = { ...byId("rq-beth"), archived: { reason: "No answer", at: NOW } }
export const BecameQuoteArchived: Story = { name: "This request became a quote that was archived", args: List.args, render: () => page(BETH_ARCHIVED, { quoteStage: { status: "quote-archived", label: "Archived" } }), globals: laptop }
/** And the list shows that request again, Archived. */
export const ListWithArchivedQuote: Story = { name: "List, a request whose quote was archived", args: List.args, render: () => list([...ALL, BETH_ARCHIVED]), globals: laptop }

/** A stale link to a request that became a job (Create job): a plain page that says so, with the job as a chip and its stage. */
const TOM_JOB: RequestData = { ...byId("rq-tom"), becameJob: { jobId: "rj-tom", customerId: "other-tom-ellis", at: NOW } }
export const BecameJob: Story = { name: "This request became a job", args: List.args, render: () => page(TOM_JOB), globals: laptop }
export const BecameJobPhone: Story = { name: "This request became a job, phone", args: List.args, render: () => page(TOM_JOB), globals: phone }

/** Archived with its reason: the page says no customer was added and has no actions. */
export const Archived: Story = { name: "Archived", args: List.args, render: () => page(byId("rq-ben")), globals: laptop }

/** The rail with Requests after Schedule and the count of new requests; the phone's More holds it. */
export const Rail: Story = { name: "Rail with the count", args: List.args, render: () => list(), globals: laptop }
export const RailPhone: Story = { name: "Rail with the count, phone", args: List.args, render: () => list(), globals: phone }

const quotes: Extract<RequestRow, { kind: "quote-waiting" | "quote-decided" }>[] = [
  { kind: "quote-waiting", id: "Q-2026-0007", jobId: "q-beth", customer: "Beth Orr", service: "Christmas lights", amount: "$1,200", sentAt: "2026-11-09T21:00:00Z" },
  { kind: "quote-waiting", id: "Q-2026-0008", jobId: "q-greg", customer: "Greg Olsen", service: "Larger sprinkler repair", amount: "$860", sentAt: "2026-11-14T17:00:00Z", remindedAt: "2026-11-16T17:00:00Z" },
  { kind: "quote-decided", id: "Q-2026-0006", jobId: "q-lena", customer: "Lena Park", outcome: "approved", amount: "$1,800", at: "2026-11-18T14:00:00Z" },
]
const home = (readOnly = false) => (
  <RequestsShell current="home">
    <RequestsHome requests={ALL} quotes={quotes} now={NOW} readOnly={readOnly} />
  </RequestsShell>
)

/** Home: "2 new requests" opens the list, one row per quote waiting says its age and has Remind. On a phone these rows are the way into Requests. */
export const HomeRows: Story = { name: "Home rows", args: List.args, render: () => home(), globals: laptop }
export const HomeRowsPhone: Story = { name: "Home rows, phone", args: List.args, render: () => home(), globals: phone }

/** Cmd+K finds a request that is New or Seen by name, street, phone, email or service. One that became a job or was archived is not listed. */
export const Search: Story = {
  name: "Search",
  args: List.args,
  render: () => (
    <RequestsShell current="home" defaultSearchOpen defaultSearchQuery="rosa">
      <RequestsHome requests={ALL} quotes={quotes} now={NOW} />
    </RequestsShell>
  ),
  globals: laptop,
}

// ---------------------------------------------------------------------------------------------------------------------- hidden twins (they play)

/** The list orders New first, and the badge counts them. */
export const ListOrderTest: Story = {
  name: "List order (test)",
  tags: HIDDEN,
  args: List.args,
  render: () => list(),
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const names = (await c.findAllByRole("button", { name: /^(Rosa Delgado|Andrea Dalton|Kevin Marsh|Tom Ellis|Ben Harlan|June Whitlow)$/ })).map((b) => b.textContent)
    await expect(names.slice(0, 2)).toEqual(["Rosa Delgado", "Andrea Dalton"])
    await expect(listOrder(ALL)[0]!.id).toBe("rq-rosa")
    await expect(names).not.toContain("Beth Orr")
    await expect(canvasElement.querySelector("[data-slot=nav-count]")?.textContent).toContain("2")
  },
}

/** On a phone Requests sits in the More sheet, first, with its count, then Quotes, Invoices, Reports and Settings in the rail's order; the bar's More button carries the count of new requests too. */
export const MoreOnAPhoneTest: Story = {
  name: "More on a phone (test)",
  tags: HIDDEN,
  args: List.args,
  render: () => list(),
  globals: phone,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(canvasElement.querySelector("[data-slot=more-count]")?.textContent).toContain("2")
    await userEvent.click(await c.findByRole("button", { name: /More/ }))
    const sheet = within(await within(document.body).findByRole("dialog", { name: "More" }))
    const items = sheet.getAllByRole("link")
    await expect(items[0]!.textContent).toContain("Requests")
    await expect(items[0]!.textContent).toContain("2 new")
    await expect(items.map((i) => i.getAttribute("href"))).toEqual(["/admin/requests", "/admin/quotes", "/admin/invoices", "/admin/reports", "/admin/settings"])
    await expect(sheet.getByRole("link", { name: /Requests/ })).toHaveAttribute("aria-current", "page")
  },
}

/** Create job on a priced service: the dialog states the effect, the page then says the request became a job and shows the job chip. A service with no price has no Create job at all. */
export const CreateJobTest: Story = {
  name: "Create job (test)",
  tags: HIDDEN,
  args: List.args,
  render: () => page(byId("rq-tom")),
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(within(canvasElement).queryByRole("button", { name: "Create job" })).not.toBeNull()
    await userEvent.click(await c.findByRole("button", { name: "Create job" }))
    const body = within(document.body)
    await expect(await body.findByText(/Add Tom Ellis as a customer and create a Sprinkler repair job\. Nothing is sent to Tom\./)).toBeInTheDocument()
    await userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name: "Create job" }))
    await expect(await c.findByRole("heading", { level: 1, name: "This request became a job" })).toBeInTheDocument()
    await expect(await c.findByRole("link", { name: "Open job" })).toBeInTheDocument()
    await expect(c.queryByText("Accepted")).toBeNull()
    await expect(matchOf(byId("rq-andrea"))?.customer.name).toBe("Andrea Dalton")
  },
}
