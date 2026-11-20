import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { RequestPage } from "./RequestPage"
import { RequestsHome } from "./RequestsHome"
import { RequestsList } from "./RequestsList"
import { RequestsShell } from "./RequestsShell"
import { REQUESTS_NOW, REQUEST_FIXTURES, listOrder, matchOf, type RequestData } from "./request-model"
import { fromSent } from "./request-store"
import type { RequestRow } from "@/components/blocks/RequestRows"

// Requests (Hannah, Nov 20 2026): someone who is not a customer asks for work that cannot be booked online. It waits here until Ryan presses Accept, even
// when the email matches a customer, so spam never becomes a customer. Each story says what Ryan sees. Pure screens over fixtures: nothing is wired.

const meta = {
  title: "Admin/Requests",
  component: RequestsList,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "The Requests item in the left nav (after Schedule, with a count of new requests), the list of what has come in, a request's own page with the match panel and its Accept and Archive actions, Home's rows and Cmd+K's Requests group. Click a name to open a request; Accept opens a dialog that states its exact effect. The clickable version is Admin / Walkthrough (clickable).",
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

/** Ryan sees two new requests on top, then the one he has looked at, then the accepted and archived ones. The name opens a request. */
export const List: Story = { name: "List", args: { requests: ALL, now: NOW, onOpen: () => undefined }, render: () => list(), globals: laptop }
export const ListPhone: Story = { name: "List, phone", args: List.args, render: () => list(), globals: phone }

/** The Status chip set to New, as the link from Home's row opens it. */
export const ListNewOnly: Story = { name: "List, New only", args: List.args, render: () => list(ALL, [{ column: "state", values: ["new"] }]), globals: laptop }

/** Nothing has come in: one line says where a request will show. */
export const ListEmpty: Story = { name: "List, nothing yet", args: List.args, render: () => list([]), globals: laptop }

/** A request the customer sent from the booking form's "Request a quote" path: New, first in the list, held outside Customers. */
const FROM_FORM = fromSent({ id: "rq-form", at: REQUESTS_NOW, first: "Sam", last: "Ito", phone: "(970) 555-0100", email: "sam.ito@example.com", contact: "text", street: "7 Oak St", town: "Erie", serviceKey: "lights", serviceName: "Christmas lights", words: "The roofline and two trees.", photos: [{ name: "a.jpg", src: "data:image/svg+xml;utf8,a" }] })
export const ListFromTheForm: Story = { name: "List, with a request from the booking form", args: { requests: ALL, now: NOW, onOpen: () => undefined }, render: () => list([FROM_FORM, ...ALL]), globals: laptop }

/** A request from a new person: New, "No match", and Accept is the one primary action. */
export const New: Story = { name: "New", args: List.args, render: () => page(byId("rq-rosa")), globals: laptop }
export const NewPhone: Story = { name: "New, phone", args: List.args, render: () => page(byId("rq-rosa")), globals: phone }

/** The email matches Andrea Dalton: the panel says so and the band's Customer tile opens her. The request still waits for Accept. */
export const NewMatches: Story = { name: "New, matches a customer", args: List.args, render: () => page(byId("rq-andrea")), globals: laptop }
export const NewMatchesPhone: Story = { name: "New, matches a customer, phone", args: List.args, render: () => page(byId("rq-andrea")), globals: phone }

/** Opening a New request writes Seen once: the pill reads Seen. */
export const Opened: Story = { name: "Opened", args: List.args, render: () => <RequestsShell><RequestPage request={byId("rq-rosa")} now={NOW} /></RequestsShell>, globals: laptop }

/** Ryan has looked at it and not decided: Seen, with the same two actions. */
export const Seen: Story = { name: "Seen", args: List.args, render: () => page(byId("rq-kevin")), globals: laptop }

/** Accept on a new person: the dialog states the exact effect, adds a customer and a job, and sends nothing. */
export const AcceptNoMatch: Story = { name: "Accept, no match", args: List.args, render: () => page(byId("rq-rosa"), { initialDialog: "accept" }), globals: laptop }

/** Accept on a match: the job goes under the customer who matches, with a choice to add a new customer instead. */
export const AcceptMatch: Story = { name: "Accept, a match", args: List.args, render: () => page(byId("rq-andrea"), { initialDialog: "accept" }), globals: laptop }

/** Archive asks why: Spam, Question answered, Not a fit or Duplicate. No customer is added. */
export const ArchiveDialog: Story = { name: "Archive", args: List.args, render: () => page(byId("rq-rosa"), { initialDialog: "archive" }), globals: laptop }

/** Accepted: the job is a chip with its stage, and the one action is Open job. */
export const Accepted: Story = { name: "Accepted", args: List.args, render: () => page(byId("rq-beth"), { jobStage: { status: "waiting", label: "Quote sent" } }), globals: laptop }
export const AcceptedPhone: Story = { name: "Accepted, phone", args: List.args, render: () => page(byId("rq-beth"), { jobStage: { status: "waiting", label: "Quote sent" } }), globals: phone }

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

/** Cmd+K finds a request that is New or Seen by name, street, phone, email or service. An accepted or archived one is not listed. */
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
    const names = (await c.findAllByRole("button", { name: /^(Rosa Delgado|Andrea Dalton|Kevin Marsh|Beth Orr|Dana Cho|Ben Harlan|June Whitlow)$/ })).map((b) => b.textContent)
    await expect(names.slice(0, 2)).toEqual(["Rosa Delgado", "Andrea Dalton"])
    await expect(listOrder(ALL)[0]!.id).toBe("rq-rosa")
    await expect(canvasElement.querySelector("[data-slot=nav-count]")?.textContent).toContain("2")
  },
}

/** On a phone Requests sits under More, first, with its count; the bar's More button carries the count too. */
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
    const items = await within(document.body).findAllByRole("menuitem")
    await expect(items[0]!.textContent).toContain("Requests")
    await expect(items.map((i) => i.textContent?.replace(/\d+ new|\d$/g, "").trim())).toEqual(["Requests", "Reports", "Settings"])
  },
}

/** Accept: the dialog states the effect, the page then shows the job chip and the stage. */
export const AcceptTest: Story = {
  name: "Accept (test)",
  tags: HIDDEN,
  args: List.args,
  render: () => page(byId("rq-rosa")),
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Accept" }))
    const body = within(document.body)
    await expect(await body.findByText(/Add Rosa Delgado as a customer and create a job that needs a quote/)).toBeInTheDocument()
    await userEvent.click(await body.findByRole("button", { name: "Accept" }))
    await expect(await c.findAllByText("Needs a quote")).not.toHaveLength(0)
    await expect(await c.findByRole("link", { name: "Open job" })).toBeInTheDocument()
    await expect(matchOf(byId("rq-andrea"))?.customer.name).toBe("Andrea Dalton")
  },
}
