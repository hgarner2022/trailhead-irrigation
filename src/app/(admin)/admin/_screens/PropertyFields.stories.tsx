import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import { PropertyFields } from "./PropertyFields"

// The nine fields of a yard, as the customer panel's Edit opens them: zones, controller, backflow, gate code, must be home,
// access note, contact name and phone, property notes; Save and Cancel under them. Without actions Save only logs.

const meta = {
  title: "Screens/Customers/PropertyFields",
  component: PropertyFields,
  parameters: { layout: "centered" },
  args: { propertyId: "prop-c100", yard: { mustBeHome: false }, onDone: () => {}, onCancel: () => {} },
  render: (args) => (
    <div className="w-[26rem] max-w-full">
      <PropertyFields {...args} />
    </div>
  ),
} satisfies Meta<typeof PropertyFields>
export default meta
type Story = StoryObj<typeof meta>

const FILLED = { zones: 8, controller: "Rachio 3 in the garage", backflowLocation: "north side", gateCode: "4471", mustBeHome: true, accessNote: "Dog loose, close the gate", contactName: "Dana", contactPhone: "+19705550123", notes: "Clay soil by the fence" }

/** A property with nothing on file: every field blank. */
export const Empty: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Zones")).toHaveValue(null)
    await expect(await canvas.findByRole("button", { name: "Save" })).toBeInTheDocument()
  },
}

/** A filled property: what Andrea's panel edits. */
export const Filled: Story = {
  args: { yard: FILLED },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Gate code")).toHaveValue("4471")
    await expect(await canvas.findByLabelText("Must be home")).toBeChecked()
  },
}

export const Phone: Story = {
  args: { yard: FILLED },
  globals: { viewport: { value: "phone", isRotated: false } },
}
