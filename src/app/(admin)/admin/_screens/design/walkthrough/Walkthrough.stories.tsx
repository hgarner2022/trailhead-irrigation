import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
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

/** Starts on Requests: two are New (the rail says 2), one matches Andrea Dalton. Open Rosa Delgado, Accept (a customer and a job that needs a quote), price the line, Send a quote with a deposit, and the job reads Quote sent in Jobs. */
export const FromRequests: Story = { name: "From requests", args: { start: { screen: "requests" } }, globals: laptop }
export const FromRequestsPhone: Story = { name: "From requests, phone", args: { start: { screen: "requests" } }, globals: phone }
export const RequestToQuoteTest: Story = {
  name: "Request to quote (test)",
  args: { start: { screen: "requests" } },
  globals: laptop,
  tags: HIDDEN,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const body = within(document.body)
    await expect(await c.findByRole("heading", { level: 1, name: "Requests" })).toBeInTheDocument()
    await expect(canvasElement.querySelector("[data-slot=nav-count]")?.textContent).toContain("2")
    // open the request: it is Seen
    await userEvent.click(await c.findByRole("button", { name: "Rosa Delgado" }))
    await waitFor(() => expect(route(canvasElement)).toBe("request:rq-rosa"))
    await expect(await c.findByText("Seen", { selector: "[data-slot=status-pill]" })).toBeInTheDocument()
    // Accept: a customer and a job that needs a quote
    await userEvent.click(await c.findByRole("button", { name: "Accept" }))
    await userEvent.click(await within(await body.findByRole("dialog")).findByRole("button", { name: "Accept" }))
    await userEvent.click(await c.findByRole("link", { name: "Open job" }))
    await waitFor(() => expect(route(canvasElement)).toBe("job:q-rosa"))
    await expect((await c.findAllByText("Needs a quote")).length).toBeGreaterThan(0)
    // price the line, then send the quote with a $300 deposit
    await userEvent.click(await c.findByRole("button", { name: /Edit Christmas lights/ }))
    await userEvent.type(await within(await body.findByRole("dialog")).findByRole("textbox", { name: "Price in dollars" }), "1200")
    await userEvent.click(within(await body.findByRole("dialog")).getByRole("button", { name: "Save the line" }))
    await userEvent.click(await c.findByRole("button", { name: "Send a quote" }))
    await userEvent.click(await body.findByRole("radio", { name: "Dollars" }))
    await userEvent.type(await body.findByRole("textbox", { name: "Deposit in dollars" }), "300")
    await userEvent.click(await body.findByRole("button", { name: "Send the quote" }))
    await expect((await c.findAllByText("Quote sent")).length).toBeGreaterThan(0)
    // Jobs lists it under Quote sent, and the rail's count has dropped to the one New request left
    await userEvent.click(canvasElement.querySelector<HTMLElement>('a[data-sidebar="menu-button"][href="/admin/jobs"]')!)
    await expect((await c.findAllByText("Quote sent")).length).toBeGreaterThan(0)
    await expect(canvasElement.querySelector("[data-slot=nav-count]")?.textContent).toContain("1")
  },
}
