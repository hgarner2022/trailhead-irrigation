import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { clearSent, writeSent } from "@/app/_flows/walkthrough/request-bridge"
import { Walkthrough } from "./Walkthrough"
import { WalkthroughDocs } from "./WalkthroughDocs"

// The admin walkthrough (Hannah, Nov 19 2026): one clickable admin prototype. Jobs, a job and its flow, the customer, Invoices and an invoice, joined by the
// links the pages already draw. Nothing is wired to the API; Start over resets it.
//
// Every visible story here opens still, in its clean start state, with no script: a reviewer clicks. Each path that used to play itself is a hidden twin
// named like the story plus " (test)" (tagged `!dev` and `!autodocs`, so it is not in the sidebar but still runs in `test:stories`).

const meta = {
  title: "Admin/Walkthrough (clickable)",
  component: Walkthrough,
  parameters: {
    layout: "fullscreen",
    docs: {
      page: WalkthroughDocs,
      description: { component: "The whole admin prototype in one story. Start on Jobs and click: every record name, tile, row and nav item opens its page inside the prototype. The Docs page lists the path." },
    },
  },
} satisfies Meta<typeof Walkthrough>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const HIDDEN = ["!dev", "!autodocs"]

const route = (canvasElement: HTMLElement) => canvasElement.querySelector("[data-slot=walkthrough]")?.getAttribute("data-route")

/** Open Andrea Dalton's repair, run the flow to Billed, go to the customer from the chip, open an invoice from Billing, then Invoices in the rail and back to Jobs. */
const laptopPath: Story["play"] = async ({ canvasElement }) => {
  const c = within(canvasElement)
  await expect(await c.findByRole("heading", { level: 1, name: "Jobs" })).toBeInTheDocument()
  // a job opens from its grid row
  await userEvent.click((await c.findAllByRole("button", { name: "Andrea Dalton" }))[0]!)
  await waitFor(() => expect(route(canvasElement)).toBe("job:andrea-repair"))
  // the flow: Schedule, Mark done, send the invoice
  const body = within(document.body)
  await userEvent.click(await c.findByRole("button", { name: "Schedule" }))
  await userEvent.click(await body.findByRole("button", { name: /Schedule and notify the customer/ }))
  await userEvent.click(await c.findByRole("button", { name: "Mark done" }))
  await userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name: "Mark done" }))
  await userEvent.click(await body.findByRole("radio", { name: /Send an invoice/ }))
  await userEvent.click(await body.findByRole("button", { name: "Send the invoice" }))
  // Billing names the invoice: it opens inside the prototype
  await userEvent.click((await c.findAllByRole("link", { name: /INV-2026-0042/ }))[0]!)
  await waitFor(() => expect(route(canvasElement)).toBe("invoice:inv-42"))
  // the customer opens from its chip
  await userEvent.click((await c.findAllByRole("link", { name: /Andrea Dalton/ }))[0]!)
  await waitFor(() => expect(route(canvasElement)).toBe("customer:andrea"))
  await expect(await c.findByRole("heading", { level: 1, name: "Andrea Dalton" })).toBeInTheDocument()
  // Invoices in the rail, then an invoice, then back to Jobs
  await userEvent.click(await c.findByRole("link", { name: "Invoices" }))
  await waitFor(() => expect(route(canvasElement)).toBe("invoices"))
  await userEvent.click((await c.findAllByRole("link", { name: /INV-2026-0042/ }))[0]!)
  await waitFor(() => expect(route(canvasElement)).toBe("invoice:inv-42"))
  await expect(await c.findByRole("heading", { level: 1, name: /INV-2026-0042/ })).toBeInTheDocument()
  await userEvent.click(await c.findByRole("link", { name: "Jobs" }))
  await waitFor(() => expect(route(canvasElement)).toBe("jobs"))
}

/** Jobs is the start. Nothing plays: click Andrea Dalton's repair and go. */
export const Laptop: Story = { name: "Laptop", globals: laptop }
export const LaptopTest: Story = { name: "Laptop (test)", globals: laptop, tags: HIDDEN, play: laptopPath }

/** The same start at 375: the tab bar and the record pages' phone layouts. */
export const Phone: Story = { name: "Phone", globals: phone }

/** Starts on Home, the live screen over the repo's own fixture: the day's stops, the money strip and what needs you. */
export const FromHome: Story = { name: "From home", args: { start: { screen: "home" } }, globals: laptop }
export const FromHomeTest: Story = {
  name: "From home (test)",
  args: { start: { screen: "home" } },
  globals: laptop,
  tags: HIDDEN,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument()
  },
}

/** Cmd+K is open on Jobs: type a name, street, phone or pass number and a hit opens its page. */
export const FromSearch: Story = { name: "From search", args: { startSearch: true }, globals: laptop }
export const FromSearchTest: Story = {
  name: "From search (test)",
  globals: laptop,
  tags: HIDDEN,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Search" }))
    const dialog = within(await within(document.body).findByRole("dialog"))
    await userEvent.type(await dialog.findByPlaceholderText(/Search by name/), "Dalton")
    await userEvent.click(await dialog.findByRole("option", { name: /480 Briggs St/, selected: false }).catch(() => dialog.findAllByRole("option").then((o) => o[0]!)))
    await waitFor(() => expect(route(canvasElement)).toMatch(/^(customer:andrea|job:)/))
  },
}

/** Record a check on Andrea's repair: the toast offers the receipt, and the receipt page is what Andrea would see, with the method and the check number. */
const receiptPath: Story["play"] = async ({ canvasElement }) => {
  const c = within(canvasElement)
  const body = within(document.body)
  await userEvent.click((await c.findAllByRole("button", { name: "Andrea Dalton" }))[0]!)
  await userEvent.click(await c.findByRole("button", { name: "Schedule" }))
  await userEvent.click(await body.findByRole("button", { name: /Schedule and notify the customer/ }))
  await userEvent.click(await c.findByRole("button", { name: "Mark done" }))
  await userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name: "Mark done" }))
  await userEvent.click(await body.findByRole("radio", { name: /Check/ }))
  await userEvent.type(await body.findByLabelText(/Check number/), "2210")
  await userEvent.click(await body.findByRole("button", { name: "Record the check" }))
  // some versions of the dialog ask once more before the payment is recorded
  const more = await body.findAllByRole("button", { name: /Record the payment/ }, { timeout: 800 }).catch(() => [])
  if (more.length) await userEvent.click(more[more.length - 1]!)
  await expect(await body.findByText("Recorded. Andrea gets a receipt by text.")).toBeInTheDocument()
  await userEvent.click(await body.findByRole("button", { name: "View the receipt" }))
  await waitFor(() => expect(route(canvasElement)).toMatch(/^receipt:check\|2210/))
  await expect(await c.findByText("Check number")).toBeInTheDocument()
}
const receiptStack = [{ screen: "jobs" }, { screen: "job", id: "andrea-repair" }, { screen: "receipt", id: "check|2210" }] as const

/** The receipt Andrea gets after a check (number 2210) is recorded on her repair, with Back to the job. */
export const Receipt: Story = { name: "Receipt", args: { startStack: [...receiptStack] }, globals: laptop }
export const ReceiptTest: Story = { name: "Receipt (test)", globals: laptop, tags: HIDDEN, play: receiptPath }

/** New job from Andrea's page: she is already chosen (with Change), her property and her last job are under her name, the zones are filled in, and the new job opens as Unscheduled on her page. */
export const NewJobFromCustomer: Story = { name: "New job from a customer", globals: laptop, args: { start: { screen: "customer", id: "andrea" }, startSheet: { customer: "andrea" } } }
export const NewJobFromCustomerTest: Story = {
  name: "New job from a customer (test)",
  globals: laptop,
  tags: HIDDEN,
  args: { start: { screen: "customer", id: "andrea" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await userEvent.click(await c.findByRole("link", { name: "New job" }))
    await expect(await body.findByText("Last job: Sprinkler repair, Nov 12. $145 unpaid.")).toBeInTheDocument()
    await expect(await body.findByRole("button", { name: "Change" })).toBeInTheDocument()
    await expect(body.getByText("4417")).toBeInTheDocument()
  },
}

/** New job is the real sheet, open on Jobs with no customer chosen: pick a customer, a service, Add job, and the new job opens as Unscheduled. */
export const NewJobSheet: Story = { name: "New job", globals: laptop, args: { startSheet: {} } }
export const NewJobSheetTest: Story = {
  name: "New job (test)",
  globals: laptop,
  tags: HIDDEN,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click((await c.findAllByRole("button", { name: "New job" }))[0]!)
    await expect(await within(document.body).findByLabelText("What are we doing?")).toBeInTheDocument()
  },
}

/** Starts on Customers: Andrea, Marcus, Dale, Hal (Active), Priya (New) and Ivy (Past customer, Do not service). Show archived adds Gus; each name opens its page. */
export const CustomersByStatus: Story = { name: "Customers by status", globals: laptop, args: { start: { screen: "customers" } } }
export const CustomersByStatusTest: Story = {
  name: "Customers by status (test)",
  globals: laptop,
  tags: HIDDEN,
  args: { start: { screen: "customers" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByRole("heading", { level: 1, name: "Customers" })).toBeInTheDocument()
    for (const name of ["Priya Nair", "Hal Reed", "Ivy Lund"]) await expect(await c.findByText(name)).toBeInTheDocument()
    await expect(c.queryByText("Gus Pratt")).toBeNull()
    await userEvent.click(c.getByRole("button", { name: "Show archived" }))
    await expect(await c.findByText("Gus Pratt")).toBeInTheDocument()
    await userEvent.click(c.getByText("Priya Nair"))
    await waitFor(() => expect(route(canvasElement)).toBe("customer:priya"))
    await expect(await c.findByRole("heading", { level: 1, name: "Priya Nair" })).toBeInTheDocument()
  },
}

/** Every customer of the world is on the list and opens a real page: Beth Orr (a quote is out, nothing else yet, so New), then Reese Holloway from a job's chip (Active, the invoice past due). Nothing is a placeholder. */
export const EveryCustomerOpens: Story = { name: "Every customer opens", globals: laptop, args: { start: { screen: "customers" } } }
export const EveryCustomerOpensTest: Story = {
  name: "Every customer opens (test)",
  globals: laptop,
  tags: HIDDEN,
  args: { start: { screen: "customers" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByRole("heading", { level: 1, name: "Customers" })).toBeInTheDocument()
    await userEvent.click(await c.findByText("Beth Orr"))
    await waitFor(() => expect(route(canvasElement)).toBe("customer:other-beth-orr"))
    await expect(await c.findByRole("heading", { level: 1, name: "Beth Orr" })).toBeInTheDocument()
    await expect(c.queryByText(/Not part of this prototype/)).toBeNull()
    await expect(await c.findByText("No messages yet")).toBeInTheDocument()
    // a job's chip opens its customer: Quotes is not needed, Jobs has Reese's blowout
    await userEvent.click(await c.findByRole("link", { name: "Jobs" }))
    await userEvent.click((await c.findAllByRole("button", { name: "Reese Holloway" }))[0]!)
    await waitFor(() => expect(route(canvasElement)).toBe("job:g-reese"))
    await userEvent.click((await c.findAllByRole("link", { name: /Reese Holloway/ }))[0]!)
    await waitFor(() => expect(route(canvasElement)).toBe("customer:other-reese-holloway"))
    await expect(await c.findByRole("heading", { level: 1, name: "Reese Holloway" })).toBeInTheDocument()
    await expect((await c.findAllByText("INV-2026-0038")).length).toBeGreaterThan(0)
  },
}

/** Gus Pratt is archived, so his page has the banner. New job for him brings him back: a toast says so on the job that opens, and his page reads Active with no banner. */
export const NewJobUnarchives: Story = { name: "New job for an archived customer", globals: laptop, args: { start: { screen: "customer", id: "gus" } } }
export const NewJobUnarchivesTest: Story = {
  name: "New job for an archived customer (test)",
  globals: laptop,
  tags: HIDDEN,
  args: { start: { screen: "customer", id: "gus" } },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await expect(await c.findByText(/Archived Nov 20/)).toBeInTheDocument()
    await userEvent.click(await c.findByRole("link", { name: "New job" }))
    await userEvent.selectOptions(await body.findByLabelText("What are we doing?"), "repair")
    await userEvent.click(await body.findByRole("button", { name: "Add job" }))
    await waitFor(() => expect(route(canvasElement)).toMatch(/^job:new-/))
    await expect(await body.findByText("Gus Pratt is active again.")).toBeInTheDocument()
    await userEvent.click((await c.findAllByRole("link", { name: /Gus Pratt/ }))[0]!)
    await waitFor(() => expect(route(canvasElement)).toBe("customer:gus"))
    await expect(await c.findByText("Active", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    await expect(canvasElement.querySelector("[data-slot=archived-banner]")).toBeNull()
  },
}

/** Starts on Requests: two are New (the rail says 2), one matches Andrea Dalton. Open Rosa Delgado (Christmas lights, no catalogue price, so Send a quote is the way out), Send a quote: a sheet asks what it is for (already chosen), the request moves into a QUOTE in Draft (no job is made) and the quote's page opens on its Quote card; price the line, set a deposit if you want one, Send a quote, and it reads Sent in Quotes and is not in Jobs. Mark it approved and the job is made then. The other way out, Create job, is on Tom Ellis (a priced repair): the request becomes an Unscheduled job at once. */
export const FromRequests: Story = { name: "From requests", args: { start: { screen: "requests" } }, globals: laptop }
export const FromRequestsPhone: Story = { name: "From requests, phone", args: { start: { screen: "requests" } }, globals: phone }
export const RequestToQuoteTest: Story = {
  name: "Request to quote to job (test)",
  args: { start: { screen: "requests" } },
  globals: laptop,
  tags: HIDDEN,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await expect(await c.findByRole("heading", { level: 1, name: "Requests" })).toBeInTheDocument()
    await expect(canvasElement.querySelector("[data-slot=nav-count]")?.textContent).toContain("2")
    // the Quotes item after Jobs counts the two quotes already waiting
    const quotesCount = () => canvasElement.querySelector('a[href="/admin/quotes"] [data-slot=nav-count]')?.textContent
    await expect(quotesCount()).toContain("2")
    // open the request: it is Seen
    await userEvent.click(await c.findByRole("button", { name: "Rosa Delgado" }))
    await waitFor(() => expect(route(canvasElement)).toBe("request:rq-rosa"))
    await expect(await c.findByText("Seen", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    // Send a quote: the request moves into a Draft quote (never a job), and the quote's page opens on the line to price
    await userEvent.click(await c.findByRole("button", { name: "Send a quote" }))
    await userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name: "Send a quote" }))
    await waitFor(() => expect(route(canvasElement)).toBe("quote:Q-2026-0009"))
    await expect(await body.findByText("Quote created for Rosa Delgado")).toBeInTheDocument()
    await expect((await c.findAllByText("Draft")).length).toBeGreaterThan(0)
    // the request has left the list: one New request is left
    await expect(canvasElement.querySelector("[data-slot=nav-count]")?.textContent).toContain("1")
    // the page is the Quote editor: price the line in its row, set a $300 deposit in the card, press Send a quote in the card, then confirm
    const card = within(canvasElement.querySelector<HTMLElement>("#quote-h")!.closest("section")!)
    await expect(card.getByRole("button", { name: "Send a quote" })).toBeDisabled()
    await userEvent.type(await card.findByRole("textbox", { name: "Price for Christmas lights" }), "1200")
    await userEvent.click(card.getByRole("radio", { name: "Dollars" }))
    await userEvent.type(await card.findByRole("textbox", { name: "Deposit in dollars" }), "300")
    await userEvent.click(card.getByRole("button", { name: "Send a quote" }))
    await userEvent.click(await body.findByRole("button", { name: "Send the quote" }))
    await expect((await c.findAllByText("Sent")).length).toBeGreaterThan(0)
    // a quote is not a job: Jobs has no row for Rosa, and the rail's request count is the one New request left
    await userEvent.click(canvasElement.querySelector<HTMLElement>('a[data-sidebar="menu-button"][href="/admin/jobs"]')!)
    await expect(await c.findByRole("heading", { level: 1, name: "Jobs" })).toBeInTheDocument()
    await expect(c.queryByText("Rosa Delgado")).toBeNull()
    await expect(c.queryByText("Needs a quote")).toBeNull()
    await expect(canvasElement.querySelector("[data-slot=nav-count]")?.textContent).toContain("1")
    // Quotes lists it at once as Sent, and the rail's count is now 3
    await expect(quotesCount()).toContain("3")
    await userEvent.click(canvasElement.querySelector<HTMLElement>('a[data-sidebar="menu-button"][href="/admin/quotes"]')!)
    await expect(await c.findByRole("heading", { level: 1, name: "Quotes" })).toBeInTheDocument()
    // the tab counts and the tiles moved with it: 3 Sent of 8, and the open pipeline is $1,200 + $860 + the new $1,200
    await expect(await c.findByRole("tab", { name: /^Sent/ })).toHaveTextContent("Sent3")
    await expect(await c.findByRole("tab", { name: /^All/ })).toHaveTextContent("All8")
    await expect(await c.findByText("$3,260")).toBeInTheDocument()
    const row = (await c.findAllByText("Q-2026-0009"))[0]!.closest("tr")!
    await expect(within(row).getByText("Rosa Delgado")).toBeInTheDocument()
    await expect(within(row).getByText("Sent", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    await expect(within(row).getByText("$300")).toBeInTheDocument()
    // a click on the row's quote chip opens the quote's own page; marking it approved is the moment the job is made
    await userEvent.click(within(row).getByRole("link", { name: "Quote: Q-2026-0009" }))
    await waitFor(() => expect(route(canvasElement)).toBe("quote:Q-2026-0009"))
    await userEvent.click(await c.findByRole("button", { name: "Mark approved" }))
    const dialog = within(await body.findByRole("dialog"))
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "How was the $300 deposit paid?" }), "check")
    await userEvent.click(dialog.getByRole("button", { name: "Mark approved and tell Rosa" }))
    await expect((await c.findAllByText(/Job created/)).length).toBeGreaterThan(0)
    // the job exists now: its chip opens it, it says which quote it came from, and Jobs lists it Unscheduled
    await userEvent.click(await c.findByRole("link", { name: "Open job" }))
    await waitFor(() => expect(route(canvasElement)).toBe("job:qj-0009"))
    await expect((await c.findAllByText("From quote")).length).toBeGreaterThan(0)
    await expect((await c.findAllByText("Unscheduled")).length).toBeGreaterThan(0)
    await userEvent.click(canvasElement.querySelector<HTMLElement>('a[data-sidebar="menu-button"][href="/admin/jobs"]')!)
    await expect((await c.findAllByText("Rosa Delgado")).length).toBeGreaterThan(0)
  },
}

/** Archiving a quote archives the request it came from: Send a quote on Rosa's request, archive the Draft with a reason, and Requests lists her again as Archived with the same reason. */
export const QuoteArchivesItsRequestTest: Story = {
  name: "Archiving a quote archives its request (test)",
  args: { start: { screen: "requests" } },
  globals: laptop,
  tags: HIDDEN,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await userEvent.click(await c.findByRole("button", { name: "Rosa Delgado" }))
    await userEvent.click(await c.findByRole("button", { name: "Send a quote" }))
    await userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name: "Send a quote" }))
    await waitFor(() => expect(route(canvasElement)).toBe("quote:Q-2026-0009"))
    await userEvent.click(await c.findByRole("button", { name: "More" }))
    await userEvent.click(await body.findByRole("menuitem", { name: "Archive" }))
    const dialog = within(await body.findByRole("dialog"))
    await expect(dialog.getByText(/Rosa's request is archived too, with the same reason/)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Archive quote" }))
    await expect(await c.findByText(/Archived as No answer\. Rosa's request is archived too\./)).toBeInTheDocument()
    // the request is back in the list, Archived, and its page says it became a quote that was archived
    await userEvent.click(canvasElement.querySelector<HTMLElement>('a[data-sidebar="menu-button"][href="/admin/requests"]')!)
    await userEvent.click(await c.findByRole("button", { name: "Rosa Delgado" }))
    await expect(await c.findByRole("heading", { level: 1, name: "This request became a quote that was archived" })).toBeInTheDocument()
    await expect(await c.findByText(/archived as No answer\. This request is archived with it\./)).toBeInTheDocument()
  },
}

/** New quote by hand, with no request: from the Quotes list's New quote, choose Andrea Dalton and what it is for; the quote opens as a Draft with the service's catalogue price, and Jobs has no new row. */
export const NewQuoteByHandTest: Story = {
  name: "New quote by hand (test)",
  args: { start: { screen: "quotes" } },
  globals: laptop,
  tags: HIDDEN,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await userEvent.click(await c.findByRole("button", { name: "New quote" }))
    const sheet = within(await body.findByRole("dialog"))
    await userEvent.type(sheet.getByRole("textbox", { name: "Find a customer" }), "Andrea")
    await userEvent.click(await sheet.findByRole("button", { name: /Andrea Dalton/ }))
    await userEvent.selectOptions(sheet.getByRole("combobox", { name: "What is this for?" }), "repair")
    await userEvent.click(sheet.getByRole("button", { name: "New quote" }))
    await waitFor(() => expect(route(canvasElement)).toBe("quote:Q-2026-0009"))
    await expect(await c.findByRole("textbox", { name: "Price for Sprinkler repair" })).toHaveValue("145")
    await expect((await c.findAllByText("Draft")).length).toBeGreaterThan(0)
    await userEvent.click(canvasElement.querySelector<HTMLElement>('a[data-sidebar="menu-button"][href="/admin/jobs"]')!)
    await expect(await c.findByRole("heading", { level: 1, name: "Jobs" })).toBeInTheDocument()
    await expect(c.queryByText("Needs a quote")).toBeNull()
  },
}

/** The other way out: Tom Ellis asked for a sprinkler repair, which has a catalogue price, so Create job leads. The request becomes an Unscheduled job at once and leaves the list. */
export const RequestToJobTest: Story = {
  name: "Request to job (test)",
  args: { start: { screen: "requests" } },
  globals: laptop,
  tags: HIDDEN,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await userEvent.click(await c.findByRole("button", { name: "Tom Ellis" }))
    await waitFor(() => expect(route(canvasElement)).toBe("request:rq-tom"))
    // a priced service: Create job is the primary
    const footer = canvasElement.querySelector("[data-slot=record-footer]")!
    await expect(footer.querySelector("button")?.textContent).toBe("Create job")
    await userEvent.click(await c.findByRole("button", { name: "Create job" }))
    await userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name: "Create job" }))
    await waitFor(() => expect(route(canvasElement)).toBe("job:rj-tom"))
    await expect(await body.findByText("Job created for Tom Ellis")).toBeInTheDocument()
    await expect(await c.findAllByText("Unscheduled")).not.toHaveLength(0)
    // Jobs lists it; Requests no longer lists Tom; no quote was made
    await userEvent.click(canvasElement.querySelector<HTMLElement>('a[data-sidebar="menu-button"][href="/admin/jobs"]')!)
    await expect((await c.findAllByText("Tom Ellis")).length).toBeGreaterThan(0)
    await userEvent.click(canvasElement.querySelector<HTMLElement>('a[data-sidebar="menu-button"][href="/admin/requests"]')!)
    await expect(await c.findByRole("heading", { level: 1, name: "Requests" })).toBeInTheDocument()
    await expect(c.queryByRole("button", { name: "Tom Ellis" })).toBeNull()
    await expect(canvasElement.querySelector('a[href="/admin/quotes"] [data-slot=nav-count]')?.textContent).toContain("2")
  },
}

/** A request sent from the booking form in the customer walkthrough is in Requests: New, first in the list, with the customer's words, photos and address, and no customer made. */
const SENT = { id: "rq-sent-test", at: "2026-11-20T10:00:00Z", first: "Sam", last: "Ito", phone: "(970) 555-0100", email: "sam.ito@example.com", contact: "text" as const, street: "7 Oak St", town: "Erie", serviceKey: "lights", serviceName: "Christmas lights", words: "The roofline and two trees.", photos: [{ name: "a.jpg", src: "data:image/svg+xml;utf8,a" }, { name: "b.jpg", src: "data:image/svg+xml;utf8,b" }] }
export const RequestFromTheBookingForm: Story = {
  name: "Request from the booking form",
  args: { start: { screen: "requests" } },
  globals: laptop,
  beforeEach: () => {
    writeSent(SENT)
    return () => clearSent()
  },
}
export const RequestFromTheBookingFormTest: Story = {
  name: "Request from the booking form (test)",
  args: { start: { screen: "requests" } },
  globals: laptop,
  tags: HIDDEN,
  beforeEach: RequestFromTheBookingForm.beforeEach,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByRole("heading", { level: 1, name: "Requests" })).toBeInTheDocument()
    await userEvent.click(await c.findByRole("button", { name: "Sam Ito" }))
    await waitFor(() => expect(route(canvasElement)).toBe("request:rq-sent-test"))
    await expect(await c.findByText("The roofline and two trees.")).toBeInTheDocument()
    await expect(await c.findAllByRole("img", { name: /Photo added/ })).toHaveLength(2)
    await expect(c.getAllByText("No match").length).toBeGreaterThan(0)
    await expect(c.getByText("7 Oak St")).toBeInTheDocument()
  },
}

/** Home carries the entry to Requests: "2 new requests" opens the list filtered to New, each quote waiting has its age and Remind. */
export const HomeRequestRows: Story = { name: "Home, requests and quotes", args: { start: { screen: "home" } }, globals: laptop }
export const HomeRequestRowsTest: Story = {
  name: "Home, requests and quotes (test)",
  args: { start: { screen: "home" } },
  globals: laptop,
  tags: HIDDEN,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await expect(await c.findByText("2 new requests", {}, { timeout: 8000 })).toBeInTheDocument()
    await expect(await c.findByText("Beth Orr, Christmas lights, $1,200")).toBeInTheDocument()
    // Remind: the quote reminder dialog, then the row says it was reminded today
    await userEvent.click((await c.findAllByRole("button", { name: "Remind" }))[0]!)
    await userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name: "Send the reminder" }))
    await expect(await c.findByRole("button", { name: "Reminded today" })).toBeDisabled()
    // the row opens the list filtered to New
    await userEvent.click(await c.findByRole("link", { name: "Open requests" }))
    await waitFor(() => expect(route(canvasElement)).toBe("requests"))
    await expect(await c.findByRole("button", { name: "Rosa Delgado" })).toBeInTheDocument()
    await expect(c.queryByRole("button", { name: "Kevin Marsh" })).toBeNull()
  },
}
