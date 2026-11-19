import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn } from "storybook/test"
import { QUOTE_SERVICES, SERVICES, type ServiceEntry } from "@/lib/booking/services"
import { ServicePicker } from "./ServicePicker"

// The service list a customer picks from: the Season Pass first, a closed service shown with its opening day, and under the list one link to request a quote. Services we quote are not in it.
function Harness({ entries, initial, onRequestQuote }: { entries: readonly ServiceEntry[]; initial?: string | null; onRequestQuote?: () => void }) {
  const [value, setValue] = useState<string | null>(initial ?? null)
  return (
    <div className="mx-auto max-w-3xl container-padding-x py-8">
      <ServicePicker entries={entries} value={value} onChange={setValue} onRequestQuote={onRequestQuote} />
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
    await expect(canvas.getByRole("radio", { name: /Sprinkler repair/ })).toBeChecked()
    await expect(canvas.getByRole("radio", { name: /^Spring turn-on/ })).toBeDisabled()
    await userEvent.click(canvas.getByRole("radio", { name: /Season Pass 2027/ }))
    await expect(canvas.getByRole("radio", { name: /Season Pass 2027/ })).toBeChecked()
    await userEvent.click(canvas.getByRole("button", { name: "Need a quote? Request one" }))
    await expect(args.onRequestQuote).toHaveBeenCalled()
  },
}

/** One service only, no request link. */
export const Empty: Story = { args: { entries: SERVICES.slice(0, 1), onRequestQuote: undefined } }

/** Nothing is closed: no "Opens" lines and no pass suggestion. */
export const InSeason: Story = { args: { entries: SERVICES.map(({ opens: _o, ...e }) => e as ServiceEntry) } }

/** The request path's own list: the services we quote, no prices, no link. */
export const QuoteList: Story = { args: { entries: QUOTE_SERVICES, onRequestQuote: undefined } }

export const Phone: Story = { args: { initial: "season-pass" }, globals: { viewport: { value: "phone", isRotated: false } } }

export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
