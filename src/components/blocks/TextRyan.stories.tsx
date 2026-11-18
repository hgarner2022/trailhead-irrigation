import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { TextRyan } from "./TextRyan"

const meta = {
  title: "Blocks/TextRyan",
  component: TextRyan,
  parameters: { layout: "padded" },
  args: { textHref: "sms:+19706927270?&body=Hi%20Ryan" },
} satisfies Meta<typeof TextRyan>
export default meta
type Story = StoryObj<typeof meta>

export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
export const Laptop: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
/** Beside a list of days that did not fit: the reason is already said. */
export const NoReasonPhone: Story = { args: { why: false }, globals: { viewport: { value: "phone", isRotated: false } } }
