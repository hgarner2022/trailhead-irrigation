import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { ServiceIcon, iconFor, type ServiceIconName } from "./ServiceIcon"

// The drawn icons of the booking form's service cards, one per service, in their 56px tiles. Each draws itself once; press a tile to see it draw again. Nothing loops.
const NAMES: ServiceIconName[] = ["season-pass", "spring-turn-on", "fall-blowout", "inspection", "repair", "rachio-install", "water-efficiency", "quote", "drop"]

function Tile({ name }: { name: ServiceIconName }) {
  const [play, setPlay] = useState(0)
  return (
    <button type="button" aria-label={`Draw ${name} again`} onClick={() => setPlay((n) => n + 1)} className="flex size-14 cursor-pointer items-center justify-center rounded-lg border border-border bg-cream">
      <ServiceIcon key={play} name={name} />
    </button>
  )
}

function Sheet() {
  return (
    <div className="flex flex-wrap gap-4 bg-background p-8">
      {NAMES.map((n) => (
        <Tile key={n} name={n} />
      ))}
    </div>
  )
}

const meta = { title: "Blocks/ServiceIcon", component: Sheet, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Sheet>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll("[data-slot=service-icon]").length).toBe(NAMES.length)
    await expect(iconFor("aeration")).toBe("drop")
  },
}

/** One tile alone. */
export const Empty: Story = { render: () => <div className="p-8"><Tile name="drop" /></div> }

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
