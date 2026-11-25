import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { SERVICES } from "@/lib/booking/services"
import { ServiceCard } from "./ServiceCard"

// One service card on its own: the whole card is the choice. One press chooses it and it opens; a second press removes the choice. The list it lives in is Blocks / ServicePicker.
const ENTRIES = bookingEntries(SERVICES, "2027-04-14")
const entryOf = (key: string) => ENTRIES.find((e) => e.key === key)!

function Harness({ service, startChosen }: { service: string; startChosen?: boolean }) {
  const [selected, setSelected] = useState(startChosen ?? false)
  return (
    <ul className="mx-auto max-w-3xl container-padding-x py-8">
      <ServiceCard entry={entryOf(service)} selected={selected} onToggle={() => setSelected((s) => !s)} />
    </ul>
  )
}

const meta = { title: "Blocks/ServiceCard", component: Harness, parameters: { layout: "fullscreen" }, args: { service: "spring-turn-on" } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const card = canvas.getByRole("button", { name: /^Spring turn-on/ })
    await userEvent.click(card)
    await expect(card).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("region", { name: "Spring turn-on" })).toBeVisible()
    await userEvent.click(card)
    await expect(card).toHaveAttribute("aria-pressed", "false")
  },
}
/** Nothing to list: a service whose description is one sentence. */
export const Empty: Story = { args: { service: "repair", startChosen: true } }
export const Phone: Story = { args: { startChosen: true }, globals: { viewport: { value: "phone", isRotated: false } } }
export const Laptop: Story = { args: { startChosen: true }, globals: { viewport: { value: "laptop", isRotated: false } } }
/** The Season Pass, white like every other card until it is chosen: its orange tile and top rule set it apart. */
export const SeasonPass: Story = { args: { service: "season-pass" }, globals: { viewport: { value: "phone", isRotated: false } } }
export const SeasonPassChosen: Story = { args: { service: "season-pass", startChosen: true }, globals: { viewport: { value: "phone", isRotated: false } } }
