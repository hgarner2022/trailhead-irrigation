import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, waitFor, within } from "storybook/test"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { QUOTE_SERVICES, SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { ServicePicker } from "./ServicePicker"

// The service cards a customer picks from on the booking form. A closed card is a drawn icon, the name, one meta line and a chevron. Pressing the card OPENS it (one at a time) to show the catalogue's
// description, what is included, the length and the price rule; "Choose this service" in the open card CHOOSES it, and on a chosen card the same button reads "Chosen" with "Remove" and unchooses it. The Season Pass is first; "Need a quote?" is a
// quiet card at the end. The icons draw once on first appearance and once on a press; nothing loops, and with reduced motion everything is simply shown.
function Harness({ entries, initial, open, onRequestQuote, quote }: { entries: readonly ServiceEntry[]; initial?: string | null; open?: string | null; onRequestQuote?: () => void; quote?: boolean }) {
  const [value, setValue] = useState<string | null>(initial ?? null)
  return (
    <div className="mx-auto max-w-3xl container-padding-x py-8">
      <ServicePicker entries={entries} value={value} onChange={setValue} defaultOpen={open} onRequestQuote={onRequestQuote} mode={quote ? "quote" : "book"} />
      <p data-testid="chosen" className="sr-only">
        {value ?? "none"}
      </p>
    </div>
  )
}

/** The list as the form shows it on its story date: the Season Pass named for its season with its two visits. */
const ENTRIES = bookingEntries(SERVICES, "2027-04-14")
const phone = { globals: { viewport: { value: "phone", isRotated: false } } }
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } }

const meta = {
  title: "Blocks/ServicePicker",
  component: Harness,
  parameters: { layout: "fullscreen" },
  args: { entries: ENTRIES, onRequestQuote: fn() },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

/** Every card closed, nothing chosen. Opening a card closes the one that was open and chooses nothing; "Choose this service" chooses and closes; the quote card asks for a quote. */
export const Default: Story = {
  play: async ({ canvas, canvasElement, userEvent, args }) => {
    const repair = canvas.getByRole("button", { name: /^Sprinkler repair/ })
    const turnOn = canvas.getByRole("button", { name: /^Spring turn-on/ })
    await expect(repair).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(repair)
    await expect(repair).toHaveAttribute("aria-expanded", "true")
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("none")
    await userEvent.click(turnOn)
    await expect(turnOn).toHaveAttribute("aria-expanded", "true")
    await expect(repair).toHaveAttribute("aria-expanded", "false")
    const panel = canvas.getByRole("region", { name: "Spring turn-on" })
    await expect(within(panel).getByText("$145 up to 8 zones, then $10 a zone")).toBeInTheDocument()
    await userEvent.click(within(panel).getByRole("button", { name: "Choose this service" }))
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("spring-turn-on")
    await expect(turnOn).toHaveAttribute("aria-expanded", "false")
    await expect(turnOn).toHaveAccessibleName(/, selected$/)
    await expect(canvasElement.querySelectorAll("[data-slot=service-check]").length).toBe(1)
    await userEvent.click(canvas.getByRole("button", { name: "Need a quote? Request one" }))
    await expect(args.onRequestQuote).toHaveBeenCalled()
  },
}

export const Phone: Story = { ...phone }
export const Laptop: Story = { ...laptop }

/** A repair open to read: the description, the length and the price, and the button that chooses it. */
export const OpenPhone: Story = { ...phone, args: { open: "repair" } }
/** The spring turn-on open: a lead line, what is included as a list, and the zone rule from its row. */
export const OpenWithListPhone: Story = { ...phone, args: { open: "spring-turn-on" } }
export const OpenLaptop: Story = { ...laptop, args: { open: "spring-turn-on" } }

/** The Season Pass open: both visits with what each costs from. */
export const PassOpenPhone: Story = { ...phone, args: { open: "season-pass" } }

/** A service chosen: the navy edge, the warm tint and the check on its icon. It is the only strong state on the screen: the Season Pass is a white card too. */
export const ChosenPhone: Story = { ...phone, args: { initial: "fall-blowout" } }
export const PassChosenPhone: Story = { ...phone, args: { initial: "season-pass" } }
export const ChosenLaptop: Story = { ...laptop, args: { initial: "fall-blowout" } }

/** Choose, remove, and switch: the open card's button chooses and closes; opened again it reads "Chosen" with "Remove", and a press unchooses in place; choosing another card replaces the choice. Only the chosen card carries a check. */
export const ToggleTest: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, canvasElement, userEvent }) => {
    const checks = () => canvasElement.querySelectorAll("[data-slot=service-check]:not([data-leaving])").length
    const blowout = canvas.getByRole("button", { name: /^Fall blowout/ })
    await userEvent.click(blowout)
    await userEvent.click(canvas.getByRole("button", { name: "Choose this service" }))
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("fall-blowout")
    await expect(checks()).toBe(1)
    // open it again: one press removes the choice, and the card stays open with the button to choose it back
    await userEvent.click(blowout)
    const chosen = canvas.getByRole("button", { name: /Chosen/ })
    await expect(chosen).toHaveAttribute("aria-pressed", "true")
    await expect(chosen).toHaveTextContent("Remove")
    await userEvent.click(chosen)
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("none")
    await expect(blowout).toHaveAttribute("aria-expanded", "true")
    await waitFor(() => expect(checks()).toBe(0))
    await userEvent.click(canvas.getByRole("button", { name: "Choose this service" }))
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("fall-blowout")
    // another card replaces it
    await userEvent.click(canvas.getByRole("button", { name: /^Sprinkler repair/ }))
    await userEvent.click(canvas.getByRole("button", { name: "Choose this service" }))
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("repair")
    await expect(blowout).toHaveAccessibleName("Fall blowout")
    await waitFor(() => expect(checks()).toBe(1))
  },
}

/** The whole header row is the one target: the point at the middle of the icon tile, of the meta line, of the "Details" pill and of the empty space beside the name all land on the card's header button, which opens and closes it. No meta line wraps. */
export const HeaderPressTest: Story = {
  ...phone,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, canvasElement, userEvent }) => {
    const card = canvas.getByRole("button", { name: /^Mid-season inspection/ }).closest("li") as HTMLElement
    const header = within(card).getByRole("button", { name: /^Mid-season inspection/ })
    const hit = (el: Element) => {
      const r = el.getBoundingClientRect()
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    }
    card.scrollIntoView({ block: "center" })
    const head = card.querySelector("[data-slot=service-head]") as HTMLElement
    await expect(head.getBoundingClientRect().height).toBeGreaterThanOrEqual(72)
    for (const part of [card.querySelector("[data-slot=service-tile]")!, within(card).getByText("From $145 · 1 hr 30 min"), card.querySelector("[data-slot=service-opener]")!]) await expect(hit(part)).toBe(header)
    const r = head.getBoundingClientRect()
    await expect(document.elementFromPoint(r.right - 8, r.bottom - 8)).toBe(header)
    await expect(card.querySelector("[data-slot=service-opener]")).toHaveTextContent("Details")
    await userEvent.click(header)
    await expect(header).toHaveAttribute("aria-expanded", "true")
    await expect(card.querySelector("[data-slot=service-opener]")).toHaveTextContent("Hide")
    await userEvent.click(header)
    await expect(header).toHaveAttribute("aria-expanded", "false")
    for (const meta of canvasElement.querySelectorAll<HTMLElement>("[data-slot=service-head] p[id$=meta]")) await expect(meta.getBoundingClientRect().height).toBeLessThan(24)
  },
}

/** By keyboard: Tab reaches the first card, Enter opens it, Tab goes on to "Choose this service", and Enter chooses it; a closed card's button is never reached. */
export const KeyboardTest: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, userEvent }) => {
    const pass = canvas.getByRole("button", { name: /^Season Pass/ })
    await userEvent.tab()
    await expect(pass).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(pass).toHaveAttribute("aria-expanded", "true")
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Choose this service" })).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("season-pass")
    await waitFor(() => expect(pass).toHaveFocus())
    await expect(pass).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.queryByRole("button", { name: "Choose this service" })).toBeNull()
  },
}

/** One service only, no quote card. */
export const Empty: Story = { args: { entries: ENTRIES.slice(0, 1), onRequestQuote: undefined } }

/** The request path's own list: the services we quote, plain choices with no prices and no link. */
export const QuoteList: Story = { args: { entries: QUOTE_SERVICES, onRequestQuote: undefined, quote: true } }
