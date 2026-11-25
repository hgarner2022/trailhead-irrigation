import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { DetailsPill } from "./DetailsPill"

// The opener every disclosure on the customer's screens wears: "Details", then "Hide". Shown closed, open, and inside a native details element, where it follows the element with no script.
function Sheet() {
  return (
    <div className="space-y-4 bg-background p-8">
      <div className="flex gap-3">
        <DetailsPill open={false} />
        <DetailsPill open />
      </div>
      <details className="group max-w-sm rounded-lg border border-border p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-foreground">
          2026 season
          <DetailsPill />
        </summary>
        <p className="mt-3 text-sm text-muted-foreground">Spring turn-on and fall blowout.</p>
      </details>
    </div>
  )
}

const meta = { title: "Blocks/DetailsPill", component: Sheet, parameters: { layout: "fullscreen" } } satisfies Meta<typeof Sheet>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement, userEvent, canvas }) => {
    await expect(canvasElement.querySelectorAll("[data-slot=details-pill]").length).toBe(3)
    await userEvent.click(canvas.getByText("2026 season"))
    await expect(canvas.getByText("Spring turn-on and fall blowout.")).toBeVisible()
  },
}
export const Empty: Story = { render: () => <div className="p-8"><DetailsPill open={false} /></div> }
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
