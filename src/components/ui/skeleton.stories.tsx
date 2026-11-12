import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Skeleton } from "./skeleton"

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
} satisfies Meta<typeof Skeleton>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    // The shape of a stat tile while its number loads.
    <div className="m-6 grid max-w-xs gap-3 rounded-lg border border-border bg-card p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  ),
}
