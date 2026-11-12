import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Input } from "./input"

const meta = {
  title: "UI/Input",
  component: Input,
  args: { placeholder: "Street address", "aria-label": "Street address" },
} satisfies Meta<typeof Input>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
