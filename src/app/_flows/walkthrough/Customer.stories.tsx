import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { CustomerDocs } from "./CustomerDocs"
import { CustomerPhone } from "./CustomerPhone"
import { CustomerWalkthrough } from "./CustomerWalkthrough"

// The customer walkthrough, the customer side (Hannah, Nov 19 2026): booking, the messages, the account, paying, the Season Pass and Details in one clickable
// prototype, starting on a phone. Nothing is sent; Start over resets it.

const meta = {
  title: "Customer/Walkthrough (clickable)",
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

// The three screens that were labelled stand-ins are the live screens now (docs/plans/2026-11-20-handoff.md, gap 3): a link in a text or an email that
// goes to Sign in, the card-saved page or the Season Pass page opens them here. Each opens still, in the phone, with a strip over it and the way back.
const phone = { viewport: { value: "phone", isRotated: false } }

/** Sign in: the live page's own card. The strip's four buttons draw its states (the form, the link sent, an email we do not have, the link not sent); the button takes any address to the sent note and sends nothing. */
export const SignInScreen: StoryObj<typeof CustomerPhone> = { name: "Sign in", globals: phone, render: () => <CustomerPhone start="sign-in" /> }

/** Card saved: the page Stripe returns the customer to after the card is updated. */
export const CardSavedScreen: StoryObj<typeof CustomerPhone> = { name: "Card saved", globals: phone, render: () => <CustomerPhone start="card-updated" /> }

/** The Season Pass page of the website, the whole page without what the site layout adds around it (header, footer, the sticky Call and Book Online bar). Its button goes to Contact, which is still a labelled stand-in. */
// The page is the live marketing page, shown as it is built. axe finds three things in it that are the site's own (the 12px orange eyebrow and the orange "Read all of
// our reviews" link on a light ground are 3.0 to 3.2:1, and the price comparison table scrolls sideways without a focusable child), so the check reports them
// as a to-do and does not fail the suite; fix them in the marketing page, not in the walkthrough.
export const SeasonPassPageScreen: StoryObj<typeof CustomerPhone> = { name: "Season Pass page", globals: phone, parameters: { a11y: { test: "todo" } }, render: () => <CustomerPhone start="season-pass-page" /> }

/** Sign in, send the link, ask for a different email, and the way back to the account (not in the sidebar). */
export const LiveScreensPath: StoryObj<typeof CustomerPhone> = {
  name: "Live screens (test)",
  tags: ["!dev", "!autodocs"],
  globals: phone,
  render: () => <CustomerPhone start="sign-in" />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument()
    await userEvent.type(await c.findByRole("textbox", { name: "Email" }), "andrea.dalton@example.com")
    await userEvent.click(await c.findByRole("button", { name: "Email me a link" }))
    await expect(await c.findByRole("heading", { name: "Check your email" })).toBeInTheDocument()
    await expect(c.getByText(/The link works one time and expires in 10 minutes/)).toBeInTheDocument()
    await userEvent.click(c.getByRole("link", { name: "Use a different email" }))
    await expect(await c.findByRole("heading", { name: "Sign in to your account" })).toBeInTheDocument()
    await userEvent.click(c.getByRole("button", { name: "Email not on file" }))
    await expect(await c.findByText("We don't have that email. Call Ryan at (970) 692-7270.")).toBeInTheDocument()
    await userEvent.click(c.getByRole("button", { name: /Your account/ }))
    await waitFor(() => expect(where(canvasElement)).toBe("account"))
  },
}

/** The phone walked through its eight steps with Next and Back, and the receipt's chips (not in the sidebar). */
export const PhoneSteps: StoryObj<typeof CustomerPhone> = {
  name: "Phone steps",
  tags: ["!dev", "!autodocs"],
  render: () => <CustomerPhone />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByText("Where is the yard?")).toBeInTheDocument()
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

/** Book online end to end: address, service, details with two photos, a day and an exact time, contact with how we reach you, Confirm and book, and the holographic card. */
export const BookingPath: StoryObj<typeof CustomerPhone> = {
  name: "Booking path",
  tags: ["!dev", "!autodocs"],
  render: () => <CustomerPhone />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const next = async (name: string | RegExp = "Continue") => userEvent.click(await c.findByRole("button", { name }))
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await c.findAllByRole("option"))[0]!)
    await next()
    await userEvent.click(await c.findByRole("radio", { name: /Sprinkler repair/ }))
    await next()
    // access, then two photos, then an exact start time (never a window), and only then who we reach
    await userEvent.click((await c.findAllByRole("radio", { name: /^Yes/ }))[0]!)
    await userEvent.click(await c.findByRole("button", { name: "Add 2 sample photos" }))
    await next()
    await userEvent.click((await c.findAllByRole("radio", { name: /\d:\d\d [ap]m/ }))[0]!)
    await next()
    await userEvent.type(await c.findByLabelText("First name"), "Andrea")
    await userEvent.type(await c.findByLabelText("Last name"), "Dalton")
    await userEvent.type(await c.findByLabelText("Email"), "andrea.dalton@example.com")
    await userEvent.type(await c.findByLabelText(/Mobile|Phone/), "9705550123")
    await expect(await c.findByLabelText("Send me tips and offers from Trailhead by email")).not.toBeChecked()
    for (const box of await c.findAllByRole("checkbox")) await userEvent.click(box)
    await userEvent.click(await c.findByRole("radio", { name: /Text and email/ }))
    await next()
    await next("Confirm and book")
    await expect(await c.findByText("You added 2 photos.")).toBeInTheDocument()
    await expect(await c.findByRole("article", { name: /booked/ })).toBeInTheDocument()
    await userEvent.click(await c.findByRole("link", { name: "your Trailhead account" }))
    await waitFor(() => expect(where(canvasElement)).toBe("account"))
    // the box was ticked: marketing email is on, and the admin walkthrough reads it
    await expect(JSON.parse(window.localStorage.getItem("trailhead-walkthrough-marketing") ?? "{}").email).toBe(true)
  },
}

/** The invoice path end to end: Pay now on the account, the pay page (what it is for and what we did), Stripe's card page (drawn, the save box unticked), Pay, the processing moment, the Paid page, the receipt with what we did. */
export const PayPath: StoryObj<typeof CustomerPhone> = {
  name: "Pay path",
  tags: ["!dev", "!autodocs"],
  render: () => <CustomerPhone />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByText("Where is the yard?")).toBeInTheDocument()
    window.postMessage({ walk: "cmd", cmd: "go", step: "account" }, "*")
    await userEvent.click(await c.findByRole("link", { name: /Pay now/ }))
    await expect(await c.findByText(/for your repair at 412 Briggs Street/)).toBeInTheDocument()
    await expect(await c.findByRole("heading", { name: "What we did" })).toBeInTheDocument()
    await userEvent.click(await c.findByRole("button", { name: /Pay \$115 by card/ }))
    await expect(await c.findByRole("checkbox", { name: "Save my payment method for future use" })).not.toBeChecked()
    await userEvent.click(await c.findByRole("button", { name: "Pay $115" }))
    await expect(await c.findByRole("button", { name: /Processing/ })).toBeDisabled()
    await expect(await c.findByText(/your payment went through/, undefined, { timeout: 5000 })).toBeInTheDocument()
    await userEvent.click(await c.findByRole("link", { name: "View the receipt" }))
    await expect(await c.findByText(/Receipt/i, { selector: "h1" })).toBeInTheDocument()
    await expect(await c.findByRole("heading", { name: "What we did" })).toBeInTheDocument()
    await expect(c.getByText("Walk the customer through it")).toBeInTheDocument()
  },
}

/** The same invoice with a card on file: one tap, no card page, then Paid. */
export const PaySavedCardPath: StoryObj<typeof CustomerPhone> = {
  name: "Pay path, saved card",
  tags: ["!dev", "!autodocs"],
  render: () => <CustomerPhone />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByText("Where is the yard?")).toBeInTheDocument()
    window.postMessage({ walk: "cmd", cmd: "go", step: "pay" }, "*")
    await userEvent.click(await c.findByRole("button", { name: "Visa ending 4242" }))
    await userEvent.click(await c.findByRole("button", { name: "Pay $115 with Visa ending 4242" }))
    await expect(await c.findByText(/your payment went through/, undefined, { timeout: 5000 })).toBeInTheDocument()
  },
}

/** Request a quote end to end: the words, two photos, the address and who to reach, "Send to Ryan", "Thanks. We've got your request." (nothing about when), and the request is kept for the admin walkthrough's Requests. */
export const RequestPath: StoryObj<typeof CustomerPhone> = {
  name: "Request path",
  tags: ["!dev", "!autodocs"],
  render: () => <CustomerPhone />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    const next = async (name: string | RegExp = "Continue") => userEvent.click(await c.findByRole("button", { name }))
    await userEvent.type(await c.findByRole("combobox", { name: "Street address" }), "123")
    await userEvent.click((await c.findAllByRole("option"))[0]!)
    await next()
    await userEvent.click(await c.findByRole("button", { name: "Need a quote? Request one" }))
    await userEvent.click(await c.findByRole("radio", { name: /Christmas lights/ }))
    await next()
    await userEvent.type(await c.findByLabelText(/A (few words|note)/), "The roofline and two trees.")
    await userEvent.click(await c.findByRole("button", { name: "Add 2 sample photos" }))
    await next()
    await userEvent.type(await c.findByLabelText("First name"), "Rosa")
    await userEvent.type(await c.findByLabelText("Last name"), "Delgado")
    await userEvent.type(await c.findByLabelText("Email"), "rosa.delgado@example.com")
    await userEvent.type(await c.findByLabelText("Phone"), "9705550166")
    await next("Send to Ryan")
    await expect(await c.findByText("Thanks. We've got your request.")).toBeInTheDocument()
    const sent = JSON.parse(window.localStorage.getItem("trailhead-walkthrough-requests") ?? "[]") as { first: string; words: string; serviceName: string; photos: unknown[] }[]
    await expect(sent[0]).toMatchObject({ first: "Rosa", words: "The roofline and two trees.", serviceName: "Christmas lights" })
    await expect(sent[0]!.photos).toHaveLength(2)
  },
}

/** The quote step: open the link in the text, Approve with a deposit (Stripe's card page, drawn), then the quote with no deposit and Decline. */
export const QuotePath: StoryObj<typeof CustomerPhone> = {
  name: "Quote path",
  tags: ["!dev", "!autodocs"],
  render: () => <CustomerPhone />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(await c.findByText("Where is the yard?")).toBeInTheDocument()
    window.postMessage({ walk: "cmd", cmd: "go", step: "quote" }, "*")
    await userEvent.click(await c.findByRole("button", { name: "trailheadirrigation.com/q/4d8w" }))
    await userEvent.click(await c.findByRole("button", { name: "Approve and pay $300" }))
    await userEvent.click(await c.findByRole("button", { name: "Pay $300" }))
    await expect(await c.findByText("We sent a receipt for your $300 deposit to beth.orr@example.com.")).toBeInTheDocument()
    await waitFor(() => expect(step(canvasElement)).toBe("quote"))
    // the quote with no deposit: Decline
    await userEvent.click(await c.findByRole("button", { name: "Back to the text" }))
    await userEvent.click(await c.findByRole("button", { name: "With no deposit" }))
    await userEvent.click(await c.findByRole("button", { name: "trailheadirrigation.com/q/4d8w" }))
    await userEvent.click(await c.findByRole("button", { name: "Decline" }))
    await userEvent.click(await within(document.body).findByRole("button", { name: "Decline the quote" }))
    await expect(await c.findByText("You declined this quote.")).toBeInTheDocument()
  },
}
