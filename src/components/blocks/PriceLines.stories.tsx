import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { PriceLines, PriceTotal, type PriceLine } from "./PriceLines"

// The one way a customer screen lists money: a name and its value on one baseline in the body face, the value heavier, right aligned, in tabular numerals; the total is the one figure in the display face.
const lines: PriceLine[] = [
  { name: "Spring turn-on", value: "$145", notes: ["April to May"] },
  { name: "Fall blowout", value: "$115", notes: ["October"] },
  { name: "Mid-season inspection with a long name that wraps onto a second line", value: "$1,145" },
]
function Harness({ total }: { total: boolean }) {
  return (
    <div className="mx-auto max-w-xl container-padding-x py-8">
      <h2 className="mb-3 type-heading text-navy">Price</h2>
      <PriceLines lines={lines} />
      {total && <PriceTotal value="$1,405" note={<p className="mt-1 text-right type-meta text-muted-foreground">Due Dec 1</p>} />}
    </div>
  )
}

const meta = { title: "Blocks/PriceLines", component: Harness, parameters: { layout: "fullscreen" }, args: { total: true } } satisfies Meta<typeof Harness>
export default meta
type Story = StoryObj<typeof meta>

const px = (el: Element, prop: "fontSize" | "fontWeight") => parseFloat(getComputedStyle(el)[prop])

export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    // The hierarchy this block exists to keep: the heading is larger than a line, a value is never smaller or lighter than its name, and the pair shares a baseline.
    const heading = canvas.getByRole("heading", { name: "Price" })
    const name = canvas.getByText("Spring turn-on")
    const value = canvas.getByText("$145")
    await expect(px(heading, "fontSize")).toBeGreaterThan(px(name, "fontSize"))
    await expect(px(value, "fontSize")).toBeGreaterThanOrEqual(px(name, "fontSize"))
    await expect(px(value, "fontWeight")).toBeGreaterThan(px(name, "fontWeight"))
    await expect(getComputedStyle(value).fontVariantNumeric).toContain("tabular-nums")
    const rights = [...canvasElement.querySelectorAll("[data-slot=price-line] dd:nth-of-type(1)")].map((el) => Math.round(el.getBoundingClientRect().right))
    await expect(new Set(rights).size).toBe(1)
  },
}
export const LinesOnly: Story = { args: { total: false } }
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
