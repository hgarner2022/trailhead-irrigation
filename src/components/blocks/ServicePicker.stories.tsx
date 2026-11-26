import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, waitFor, within } from "storybook/test"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { QUOTE_SERVICES, SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { ServicePicker } from "./ServicePicker"

// The service cards a customer picks from on the booking form. The whole card is the choice: one press chooses a service and the chosen card opens to show what is included, the length and
// the price rule; a second press removes the choice; another card replaces it. No card carries a mark, chosen or not (no check, ring, dot or badge): a card at rest is raised on a soft shadow and gives under a press; the chosen one is
// filled navy, raised higher and open. The orange focus ring is for the keyboard only. The Season Pass is first; "Need a quote?" is a quiet card
// at the end. The icons draw once on first appearance and once on a press; nothing loops, and with reduced motion everything is simply shown.
function Harness({ entries, initial, onRequestQuote, quote }: { entries: readonly ServiceEntry[]; initial?: string | null; onRequestQuote?: () => void; quote?: boolean }) {
  const [value, setValue] = useState<string | null>(initial ?? null)
  return (
    <div className="mx-auto max-w-3xl container-padding-x py-8">
      <ServicePicker entries={entries} value={value} onChange={setValue} onRequestQuote={onRequestQuote} mode={quote ? "quote" : "book"} />
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

/** Choose, switch, remove: one press chooses and opens the card; another card replaces the choice and the first closes; the chosen card pressed again removes the choice. The chosen card carries no mark: the navy header and the open detail say it. */
export const Default: Story = {
  play: async ({ canvas, canvasElement, userEvent, args }) => {
    // nothing round and no second drawing in any card's button, whatever its state; and a click never leaves the keyboard's ring
    const checks = () => canvasElement.querySelectorAll("[data-slot=service-head] .rounded-full, [data-slot=service-head] svg:not([data-slot=service-icon]), [data-slot=service-entry][data-kbd]").length
    const repair = canvas.getByRole("button", { name: /^Sprinkler repair/ })
    const turnOn = canvas.getByRole("button", { name: /^Spring turn-on/ })
    await expect(repair).toHaveAttribute("aria-pressed", "false")
    await expect(checks()).toBe(0)
    await userEvent.click(repair)
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("repair")
    await expect(repair).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("region", { name: "Sprinkler repair" })).toBeVisible()
    await userEvent.click(turnOn)
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("spring-turn-on")
    await expect(repair).toHaveAttribute("aria-pressed", "false")
    // its lines come in one after another
    await waitFor(() => expect(within(canvas.getByRole("region", { name: "Spring turn-on" })).getByText("$145 up to 8 zones, then $10 a zone")).toBeVisible())
    await expect(checks()).toBe(0)
    await userEvent.click(turnOn)
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("none")
    await expect(checks()).toBe(0)
    await userEvent.click(canvas.getByRole("button", { name: "Need a quote? Request one" }))
    await expect(args.onRequestQuote).toHaveBeenCalled()
  },
}

export const Phone: Story = { ...phone }
export const Laptop: Story = { ...laptop }

/** A service chosen: the navy header every chosen option has, the card raised and open on what is included, and no mark. It opens this way on load too, with no orange ring round it. */
export const ChosenPhone: Story = { ...phone, args: { initial: "spring-turn-on" } }
export const ChosenLaptop: Story = { ...laptop, args: { initial: "spring-turn-on" } }
/** The Season Pass chosen: both visits with what each costs from. */
export const PassChosenPhone: Story = { ...phone, args: { initial: "season-pass" } }

/** The whole card is the one target and no meta line wraps: the middle of the icon tile and the card's empty right end both land on the card's button, which is at least 72px tall. */
export const TargetTest: Story = {
  ...phone,
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, canvasElement }) => {
    const button = canvas.getByRole("button", { name: /^Mid-season inspection/ })
    button.scrollIntoView({ block: "center" })
    const hit = (el: Element) => {
      const r = el.getBoundingClientRect()
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("button")
    }
    await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(72)
    await expect(hit(button.querySelector("[data-slot=service-tile]")!)).toBe(button)
    const r = button.getBoundingClientRect()
    await expect(document.elementFromPoint(r.right - 24, r.top + r.height / 2)?.closest("button")).toBe(button)
    for (const meta of canvasElement.querySelectorAll<HTMLElement>("[data-slot=service-head] span.whitespace-nowrap")) await expect(meta.getBoundingClientRect().height).toBeLessThan(24)
  },
}

/** By keyboard: Tab reaches the first card, Space chooses it and it opens; Tab moves on to the next card (the open detail holds nothing to stop at); Enter chooses that one instead; Enter again removes the choice. */
export const KeyboardTest: Story = {
  tags: ["!dev", "!autodocs"],
  play: async ({ canvas, userEvent }) => {
    const pass = canvas.getByRole("button", { name: /^Season Pass/ })
    const turnOn = canvas.getByRole("button", { name: /^Spring turn-on/ })
    await userEvent.tab()
    await expect(pass).toHaveFocus()
    // the keyboard holds the focus: this card, and only this card, shows the ring
    await expect(pass.closest("li")).toHaveAttribute("data-kbd")
    await userEvent.keyboard(" ")
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("season-pass")
    await expect(pass).toHaveAttribute("aria-pressed", "true")
    await userEvent.tab()
    await expect(turnOn).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("spring-turn-on")
    await waitFor(() => expect(pass).toHaveAttribute("aria-pressed", "false"))
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByTestId("chosen")).toHaveTextContent("none")
    // a pointer takes the ring away, chosen or not
    await userEvent.click(pass)
    await expect(pass.closest("li")).not.toHaveAttribute("data-kbd")
  },
}

/** One service only, no quote card. */
export const Empty: Story = { args: { entries: ENTRIES.slice(0, 1), onRequestQuote: undefined } }

/** The request path's own list: the services we quote, plain choices with no prices and no link. */
export const QuoteList: Story = { args: { entries: QUOTE_SERVICES, onRequestQuote: undefined, quote: true } }
