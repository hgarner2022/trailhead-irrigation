import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { CustomerDocs } from "./CustomerDocs"
import { CustomerPhone } from "./CustomerPhone"
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
      description: { component: "You are Andrea Dalton, a customer, on your phone. The steps are on the left; click Next, or tap anything in the phone." },
    },
  },
} satisfies Meta<typeof CustomerWalkthrough>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const where = (el: HTMLElement) => el.querySelector("[data-slot=flow-screen]")?.getAttribute("data-where")
const page = (el: HTMLElement) => el.querySelector("[data-slot=flow-screen]")?.getAttribute("data-page")
const step = (el: HTMLElement) => el.querySelector("[data-slot=flow-screen]")?.getAttribute("data-step")
const tell = (cmd: string) => window.postMessage({ walk: "cmd", cmd }, "*")

/** The presentation: the Steps column, the phone frame, Back and Next. */
export const Walkthrough: Story = { name: "Walkthrough", globals: laptop }

/** The phone alone, the page inside the frame (not in the sidebar). It has no play: the presentation loads it. */
export const PhoneScreens: StoryObj<typeof CustomerPhone> = {
  name: "Phone screens",
  tags: ["!dev", "!autodocs"],
  render: () => <CustomerPhone />,
}

/** The phone walked through its eight steps with Next and Back, and the receipt's chips (not in the sidebar). */
export const PhoneSteps: StoryObj<typeof CustomerPhone> = {
  name: "Phone steps",
  tags: ["!dev", "!autodocs"],
  render: () => <CustomerPhone />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByText("What can we do for you?")).toBeInTheDocument()
    const order = [["texts", "texts"], ["account", "home"], ["visits", "visit"], ["pay", "pay"], ["receipts", null], ["pass", null], ["details", "details"]] as const
    for (const [lit, shown] of order) {
      tell("next")
      await waitFor(() => expect(step(canvasElement)).toBe(lit))
      if (shown) await waitFor(() => expect([where(canvasElement), page(canvasElement)]).toContain(shown))
      if (lit === "receipts") {
        await userEvent.click(await c.findByRole("button", { name: "Check" }))
        await expect(await c.findByText(/Check number/)).toBeInTheDocument()
      }
    }
    tell("back")
    await waitFor(() => expect(step(canvasElement)).toBe("pass"))
  },
}

/** Book online end to end: service, address, a day and an exact time, contact with how we reach you, two photos, Confirm and book, and the holographic card. */
export const BookingPath: StoryObj<typeof CustomerPhone> = {
  name: "Booking path",
  tags: ["!dev", "!autodocs"],
  render: () => <CustomerPhone />,
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

