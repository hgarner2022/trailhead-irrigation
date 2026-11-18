import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Input } from "@/components/ui/input"
import { FormRow } from "./FormRow"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/FormRow",
  component: FormRow,
  parameters: { layout: "padded" },
  args: { label: "Access note", hint: "Gate code, dog, where the controller is", children: <Input className="min-h-11" /> },
  globals: LAPTOP,
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
} satisfies Meta<typeof FormRow>
export default meta
type Story = StoryObj<typeof meta>

/** The label above, the 44px control, the hint under it. */
export const Default: Story = {}

/** A row that has nothing to say under its control, and one that is wrong. */
export const Empty: Story = {
  args: { label: "Check number", hint: undefined, error: "Use numbers only.", children: <Input className="min-h-11" defaultValue="10x2" /> },
}

export const Phone: Story = { globals: PHONE }
