import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { TodayMoney } from "./TodayMoney"

const meta = {
  title: "Blocks/TodayMoney",
  component: TodayMoney,
  parameters: { layout: "padded" },
  args: {
    figures: [
      { label: "Today", value: "$780" },
      { label: "Done", value: "$385" },
      { label: "Ahead", value: "$395" },
      { label: "Unpaid", value: "$190" },
    ],
    scheduleHref: "/admin/schedule?day=2026-11-12",
  },
} satisfies Meta<typeof TodayMoney>
export default meta
type Story = StoryObj<typeof meta>

/** Four figures and View schedule at the right. */
export const Default: Story = {}

/** An empty day reads $0 across and keeps the button. */
export const EmptyDay: Story = {
  args: { figures: ["Today", "Done", "Ahead", "Unpaid"].map((label) => ({ label, value: "$0" })) },
}

/** Two rows of two with the button full width under them. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
