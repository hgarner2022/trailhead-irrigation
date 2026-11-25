import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { Tick } from "./Tick"

// The one tick of the customer's screens: a thin line in ink for "included", "done" and "saved". Never a filled badge, never green or orange (docs/DESIGN.md, Marks).
const meta = { title: "Blocks/Tick", component: Tick, parameters: { layout: "centered" } } satisfies Meta<typeof Tick>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const tick = canvasElement.querySelector("[data-slot=tick]")!
    await expect(tick).toHaveAttribute("aria-hidden", "true")
    await expect(tick.getAttribute("class")).not.toMatch(/positive|success|primary/)
  },
}

/** In a list of what is included: quiet navy beside body text. */
export const InAList: Story = {
  render: () => (
    <ul className="w-72 space-y-2">
      {["Sprinkler head adjustments", "Minor leak fixes where possible", "Controller programming"].map((line) => (
        <li key={line} className="flex items-start gap-2 text-base leading-snug text-foreground">
          <Tick className="mt-1" />
          {line}
        </li>
      ))}
    </ul>
  ),
}

/** Beside a line it takes the line's own ink, and draws in once. */
export const DrawnBesideWords: Story = {
  render: () => (
    <p className="flex items-center gap-3 type-heading text-navy">
      <Tick draw className="size-5 text-current" />
      Season Pass added.
    </p>
  ),
}
