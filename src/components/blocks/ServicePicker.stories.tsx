import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import { QUOTE_SERVICES, SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { ServicePicker } from "./ServicePicker"

// The service list a customer picks from: one card per service with a photo, its name, one line, its price and length and a chevron, the whole header the button. The open card is the picked service and holds only
// what is included. The Season Pass is first, and under the list a quiet row requests a quote. Services we quote are not in it.
function Harness({ entries, initial, onRequestQuote, quote }: { entries: readonly ServiceEntry[]; initial?: string | null; onRequestQuote?: () => void; quote?: boolean }) {
  const [value, setValue] = useState<string | null>(initial ?? null)
  return (
    <div className="mx-auto max-w-3xl container-padding-x py-8">
      <ServicePicker entries={entries} value={value} onChange={setValue} onRequestQuote={onRequestQuote} mode={quote ? "quote" : "book"} />
    </div>
  )
}

const meta = {
  title: "Blocks/ServicePicker",
  component: Harness,
  parameters: { layout: "fullscreen" },
  args: { entries: SERVICES, onRequestQuote: fn() },
} satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { initial: "repair" },
  play: async ({ canvas, userEvent, args }) => {
    await expect(canvas.getByRole("button", { name: /^Sprinkler repair/ })).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(canvas.getByRole("button", { name: /^Spring turn-on/ }))
    await expect(canvas.getByRole("button", { name: /^Spring turn-on/ })).toHaveAttribute("aria-expanded", "true")
    await expect(canvas.getByRole("button", { name: /^Sprinkler repair/ })).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(canvas.getByRole("button", { name: "Need a quote? Request one" }))
    await expect(args.onRequestQuote).toHaveBeenCalled()
  },
}

/** One service only, no request link. */
export const Empty: Story = { args: { entries: SERVICES.slice(0, 1), onRequestQuote: undefined } }

/** The request path's own list: the services we quote, plain choices with no prices and no link. */
export const QuoteList: Story = { args: { entries: QUOTE_SERVICES, onRequestQuote: undefined, quote: true } }

export const Phone: Story = { args: { initial: "season-pass" }, globals: { viewport: { value: "phone", isRotated: false } } }

export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
