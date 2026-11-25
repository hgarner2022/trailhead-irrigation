import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { bookingEntries } from "@/lib/booking/pass-entry"
import { SERVICES } from "@/lib/booking/services"
import { ServiceCard } from "./ServiceCard"

// One service card on its own: the header row opens and closes it, the button inside chooses the service or removes the choice. The list it lives in is Blocks / ServicePicker.
const ENTRIES = bookingEntries(SERVICES, "2027-04-14")
const entryOf = (key: string) => ENTRIES.find((e) => e.key === key)!

function Harness({ service, startOpen, startChosen }: { service: string; startOpen?: boolean; startChosen?: boolean }) {
  const [open, setOpen] = useState(startOpen ?? false)
  const [selected, setSelected] = useState(startChosen ?? false)
  return (
    <ul className="mx-auto max-w-3xl container-padding-x py-8">
      <ServiceCard entry={entryOf(service)} open={open} selected={selected} onToggle={() => setOpen((o) => !o)} onChoose={(on) => (setSelected(on), on && setOpen(false))} />
    </ul>
  )
}

const meta = { title: "Blocks/ServiceCard", component: Harness, parameters: { layout: "fullscreen" }, args: { service: "spring-turn-on" } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const header = canvas.getByRole("button", { name: /^Spring turn-on/ })
    await userEvent.click(header)
    await userEvent.click(canvas.getByRole("button", { name: "Choose this service" }))
    await expect(header).toHaveAccessibleName(/, selected$/)
    await expect(header).toHaveAttribute("aria-expanded", "false")
  },
}
/** Nothing to list: a service whose description is one sentence. */
export const Empty: Story = { args: { service: "repair", startOpen: true } }
export const Phone: Story = { args: { startOpen: true }, globals: { viewport: { value: "phone", isRotated: false } } }
export const Laptop: Story = { args: { startOpen: true }, globals: { viewport: { value: "laptop", isRotated: false } } }
/** The Season Pass, white like every other card: its orange tile and top rule set it apart, and it does not look chosen. */
export const SeasonPass: Story = { args: { service: "season-pass" }, globals: { viewport: { value: "phone", isRotated: false } } }
export const ChosenOpen: Story = { args: { startOpen: true, startChosen: true }, globals: { viewport: { value: "phone", isRotated: false } } }
