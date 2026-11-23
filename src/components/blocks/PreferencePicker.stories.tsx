import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import type { TimingPreference } from "@/lib/admin/types"
import { PreferencePicker } from "./PreferencePicker"

// The customer's timing choice for one visit kind: Early season, Our recommended (the default) and Late season, each with its month. On Details (with a visible legend), in the dialog the Season Pass
// tab and the banner open, and on the page a Preference request's link opens. Controlled; nothing saves here.
const meta = {
  title: "Blocks/PreferencePicker",
  component: PreferencePicker,
  parameters: { layout: "padded" },
  args: { kind: "blowout", value: "recommended", onChange: () => {} },
  render: (args) => {
    const [value, setValue] = useState<TimingPreference>(args.value)
    return <PreferencePicker {...args} value={value} onChange={setValue} />
  },
} satisfies Meta<typeof PreferencePicker>
export default meta
type Story = StoryObj<typeof meta>

/** The fall blowout with Our recommended selected, as it starts for every customer. */
export const Default: Story = {}
/** The spring turn-on with a legend, as Details shows it, Early season chosen. */
export const TurnOnWithLegend: Story = { args: { kind: "turn-on", value: "earlier", legend: true } }
/** Late season chosen. */
export const Late: Story = { args: { value: "later" } }
export const Phone: Story = { args: { legend: true }, globals: { viewport: { value: "phone", isRotated: false } } }
