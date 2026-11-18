import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RecordFooter } from "./RecordFooter"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const noop = () => {}

const meta = {
  title: "Blocks/RecordFooter",
  component: RecordFooter,
  parameters: { layout: "padded" },
  args: {
    primary: { label: "Mark done", onClick: noop },
    secondary: [{ label: "Move", onClick: noop }, { label: "Not done", onClick: noop }],
    more: [{ label: "Edit", onClick: noop }, { label: "Send a text", onClick: noop }],
    destructive: { label: "Cancel visit", onClick: noop },
  },
  globals: LAPTOP,
  decorators: [(Story) => <div className="max-w-[480px] border-t border-border pt-4"><Story /></div>],
} satisfies Meta<typeof RecordFooter>
export default meta
type Story = StoryObj<typeof meta>

/** One primary, two outlines, More and the one destructive ghost at the far right. */
export const Default: Story = {}

/** A Done and paid record: Open job is the only button and More holds the quiet ones. */
export const Empty: Story = {
  args: { primary: { label: "Open job", href: "/admin/jobs?job=j1" }, secondary: undefined, more: [{ label: "Send a text", onClick: noop }], destructive: undefined },
}

/** On a phone the primary has its own row. */
export const Phone: Story = { globals: PHONE }
