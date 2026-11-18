import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SplitButton } from "./SplitButton"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/SplitButton",
  component: SplitButton,
  parameters: { layout: "padded" },
  args: {
    label: "Move and text the customer",
    onClick: () => {},
    menuLabel: "More ways to move",
    menu: [{ label: "Move without texting", onSelect: () => {} }],
  },
  globals: LAPTOP,
} satisfies Meta<typeof SplitButton>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** No quieter twin: just the button. */
export const Empty: Story = { args: { menu: [] } }

/** A booked time always texts the customer, so the twin is listed and switched off. */
export const Phone: Story = {
  globals: PHONE,
  args: { menu: [{ label: "Move without texting", onSelect: () => {}, disabled: true }] },
}
