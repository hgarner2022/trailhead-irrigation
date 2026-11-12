import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Textarea } from "./textarea"

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  args: { placeholder: "Anything the tech should know", "aria-label": "Notes for the tech" },
} satisfies Meta<typeof Textarea>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
