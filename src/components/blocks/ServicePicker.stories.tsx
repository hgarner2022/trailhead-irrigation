import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, waitFor, within } from "storybook/test"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { QUOTE_SERVICES, SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { ServicePicker } from "./ServicePicker"

// The service cards a customer picks from on the booking form. A closed card is a drawn icon, the name, one meta line and a chevron. Pressing the card OPENS it (one at a time) to show the catalogue's
// description, what is included, the length and the price rule; "Choose this service" in the open card, or the round check beside the meta line, CHOOSES it. The Season Pass is first; "Need a quote?" is a
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
  play: async ({ canvas, userEvent, args }) => {
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
    await expect(canvas.getByRole("button", { name: "Choose Spring turn-on" })).toHaveAttribute("aria-pressed", "true")
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

/** A service chosen: the navy edge, the warm tint and the check on its icon. */
export const ChosenPhone: Story = { ...phone, args: { initial: "fall-blowout" } }
export const PassChosenPhone: Story = { ...phone, args: { initial: "season-pass" } }
export const ChosenLaptop: Story = { ...laptop, args: { initial: "fall-blowout" } }

/** The round check beside the meta line chooses a service without opening it, and pressed again unchooses it. */
export const QuickChooseTest: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, userEvent }) => {
    const check = canvas.getByRole("button", { name: "Choose Fall blowout" })
    await userEvent.click(check)
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("fall-blowout")
    await expect(check).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("button", { name: /^Fall blowout/ })).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(canvas.getByRole("button", { name: "Choose Sprinkler repair" }))
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("repair")
    await expect(check).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(canvas.getByRole("button", { name: "Choose Sprinkler repair" }))
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("none")
  },
}

/** By keyboard: Tab reaches the first card, Enter opens it, Tab goes on to its check and then to "Choose this service", and Enter chooses it; a closed card's button is never reached. */
export const KeyboardTest: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, userEvent }) => {
    const pass = canvas.getByRole("button", { name: /^Season Pass/ })
    await userEvent.tab()
    await expect(pass).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(pass).toHaveAttribute("aria-expanded", "true")
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: /^Choose Season Pass/ })).toHaveFocus()
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
