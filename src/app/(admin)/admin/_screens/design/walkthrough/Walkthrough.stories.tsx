import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Walkthrough } from "./Walkthrough"
import { WalkthroughDocs } from "./WalkthroughDocs"

// Start here (Hannah, Nov 19 2026): one clickable admin prototype. Jobs, a job and its flow, the customer, Invoices and an invoice, joined by the
// links the pages already draw. Nothing is wired to the API; Start over resets it.

const meta = {
  title: "Design/Start here: the admin, clickable",
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

const route = (canvasElement: HTMLElement) => canvasElement.querySelector("[data-slot=walkthrough]")?.getAttribute("data-route")

/** Jobs is the start. Open Andrea Dalton's repair, run the flow to Billed, go to the customer from the chip, open an invoice from Billing, then Invoices in the rail and back to Jobs. */
export const Laptop: Story = {
  name: "Laptop",
  globals: laptop,
  play: async ({ canvasElement }) => {
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
    const confirm = await body.findAllByRole("button", { name: "Send the invoice" })
    await userEvent.click(confirm[confirm.length - 1]!)
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
  },
}

/** The same path at 375: the tab bar and the record pages' phone layouts. */
export const Phone: Story = { name: "Phone", globals: phone }

/** Starts on Home, the live screen over the repo's own fixture: the day's stops, the money strip and what needs you. */
export const FromHome: Story = {
  name: "From home",
  args: { start: { screen: "home" } },
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument()
  },
}

/** Starts with Cmd+K open: type a name, street, phone or pass number and a hit opens its page. */
export const FromSearch: Story = {
  name: "From search",
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click(await c.findByRole("button", { name: "Search" }))
    const dialog = within(await within(document.body).findByRole("dialog"))
    await userEvent.type(await dialog.findByPlaceholderText(/Search by name/), "Dalton")
    await userEvent.click(await dialog.findByRole("option", { name: /480 Briggs St/, selected: false }).catch(() => dialog.findAllByRole("option").then((o) => o[0]!)))
    await waitFor(() => expect(route(canvasElement)).toMatch(/^(customer:andrea|job:)/))
  },
}

/** New job is the real sheet: pick a customer, a service, Add job, and the new job opens as Unscheduled. */
export const NewJobSheet: Story = {
  name: "New job",
  globals: laptop,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await userEvent.click((await c.findAllByRole("button", { name: "New job" }))[0]!)
    await expect(await within(document.body).findByLabelText("What are we doing?")).toBeInTheDocument()
  },
}
