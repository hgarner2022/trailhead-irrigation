import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { CustomerDocs } from "./CustomerDocs"
import { CustomerWalkthrough } from "./CustomerWalkthrough"

// Start here, the customer side (Hannah, Nov 19 2026): booking, the messages, the account, paying, the Season Pass and Details in one clickable
// prototype, starting on a phone. Nothing is sent; Start over resets it.

const meta = {
  title: "Design/Start here: the customer, clickable",
  component: CustomerWalkthrough,
  parameters: {
    layout: "fullscreen",
    docs: {
      page: CustomerDocs,
      description: { component: "The customer side in one story: book online, the texts and emails, the account, Reschedule and Cancel, paying an invoice to its receipt, the Season Pass and Details. Phone first. The Docs page lists the order." },
    },
  },
} satisfies Meta<typeof CustomerWalkthrough>
export default meta
type Story = StoryObj<typeof meta>

const phone = { viewport: { value: "phone", isRotated: false } }
const laptop = { viewport: { value: "laptop", isRotated: false } }
const where = (el: HTMLElement) => el.querySelector("[data-slot=flow-screen]")?.getAttribute("data-where")
const page = (el: HTMLElement) => el.querySelector("[data-slot=flow-screen]")?.getAttribute("data-page")

/** Starts on Book online. Next in the strip walks the seven steps; the booking's confirmation opens the account. */
export const Phone: Story = {
  name: "Phone",
  globals: phone,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByText("What can we do for you?")).toBeInTheDocument()
    // the steps strip jumps: texts, then the account, then a visit
    await userEvent.click(await c.findByRole("button", { name: "Next: Texts and emails" }))
    await waitFor(() => expect(where(canvasElement)).toBe("texts"))
    await userEvent.click(await c.findByRole("button", { name: "Next: Account" }))
    await waitFor(() => expect(page(canvasElement)).toBe("home"))
    await userEvent.click(await c.findByRole("button", { name: "Next: Visits" }))
    await waitFor(() => expect(page(canvasElement)).toBe("visits"))
    await userEvent.click(await c.findByRole("button", { name: "Next: Pay an invoice" }))
    await waitFor(() => expect(page(canvasElement)).toBe("pay"))
    await userEvent.click(await c.findByRole("button", { name: "Next: Season Pass" }))
    await waitFor(() => expect(where(canvasElement)).toBe("pass"))
    await userEvent.click(await c.findByRole("button", { name: "Next: Details" }))
    await waitFor(() => expect(page(canvasElement)).toBe("details"))
  },
}

export const Laptop: Story = { name: "Laptop", globals: laptop }

/** Book online end to end: service, address, a day and an exact time, contact with how we reach you, two photos, Confirm and book, and the holographic card. */
export const BookingPath: Story = {
  name: "Booking path",
  globals: phone,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const next = async (name: string | RegExp = "Continue") => userEvent.click(await c.findByRole("button", { name }))
    await userEvent.click(await c.findByRole("radio", { name: /Sprinkler repair/ }))
    await next()
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await c.findAllByRole("option"))[0]!)
    await userEvent.click((await c.findAllByRole("button", { name: /^Yes/ }))[0]!)
    await next()
    // an exact start time, never a window
    await userEvent.click((await c.findAllByRole("radio", { name: /\d:\d\d [ap]m/ }))[0]!)
    await next()
    await userEvent.type(await c.findByLabelText("First name"), "Andrea")
    await userEvent.type(await c.findByLabelText("Last name"), "Dalton")
    await userEvent.type(await c.findByLabelText("Email"), "andrea.dalton@example.com")
    await userEvent.type(await c.findByLabelText(/Mobile|Phone/), "9705550123")
    for (const box of await c.findAllByRole("checkbox")) await userEvent.click(box)
    await userEvent.click(await c.findByRole("radio", { name: /Text and email/ }))
    await next()
    await userEvent.click(await c.findByRole("button", { name: "Add 2 sample photos" }))
    await next()
    await next("Confirm and book")
    await expect(await c.findByText("You added 2 photos. Ryan sees them before the visit.")).toBeInTheDocument()
    await expect(await c.findByRole("article", { name: /booked/ })).toBeInTheDocument()
    await userEvent.click(await c.findByRole("link", { name: "your Trailhead account" }))
    await waitFor(() => expect(where(canvasElement)).toBe("account"))
  },
}

/** Starts on the account, for the path after booking. */
export const FromTheAccount: Story = { name: "From the account", args: { start: "account" }, globals: phone }
