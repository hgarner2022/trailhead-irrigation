import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData, SettingsChange } from "@/lib/admin/types"
import { AdminShell } from "@/components/blocks/AdminShell"
import { SettingsScreen } from "./SettingsScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home and Schedule stories. The snapshot already carries
// four logged changes from November 5 to 11; a change made in a story is
// stamped from `today`. The fixture's settings are the real starting values.
const TODAY = "2026-11-12T19:56:30Z"
const data = snapshot as AdminData

const more: SettingsChange[] = [
  { id: "sc5", at: "2026-11-12T15:10:00Z", who: "Ryan", field: "Ryan Garner repairs per day", from: "3", to: "4" },
  { id: "sc6", at: "2026-11-12T16:42:00Z", who: "Hannah", field: "Fall order", from: "Erie, Firestone, Longmont, Broomfield, Louisville, Lafayette", to: "Firestone, Erie, Longmont, Broomfield, Louisville, Lafayette" },
  { id: "sc7", at: "2026-11-12T18:03:00Z", who: "Hannah", field: "Renewal (email)", from: "On", to: "Off" },
]

const meta = {
  title: "Screens/Settings",
  component: SettingsScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: TODAY },
  render: (args) => (
    <AdminShell current="settings" user={{ initials: "HG", name: "Hannah" }}>
      <SettingsScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof SettingsScreen>
export default meta
type Story = StoryObj<typeof meta>

/** The People tab: everyone who works here, owners first, with their role, days, hours and most per day. */
export const People: Story = {
  globals: { viewport: { value: "laptop", isRotated: false } },
}

/** The Services tab: the catalogue with what each visit includes, the price rule, minutes, taxable and active. */
export const Services: Story = {
  args: { defaultTab: "services" },
  globals: { viewport: { value: "laptop", isRotated: false } },
}

/** On a phone the Services table scrolls inside its card, the description box keeping its width. */
export const ServicesPhone: Story = {
  args: { defaultTab: "services" },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The Billing tab: invoices are due in 14 days and sales tax is off, so the percent is not asked for. */
export const Billing: Story = {
  args: { defaultTab: "billing" },
  globals: { viewport: { value: "laptop", isRotated: false } },
}

/** Sales tax switched on: the percent field appears. */
export const BillingWithSalesTax: Story = {
  args: { defaultTab: "billing" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("checkbox", { name: "Collect Colorado sales tax" }))
    await expect(await canvas.findByRole("textbox", { name: "Sales tax percent" })).toBeInTheDocument()
  },
}

export const Messages: Story = {
  args: { defaultTab: "messages" },
  globals: { viewport: { value: "laptop", isRotated: false } },
}

export const ApiKeys: Story = {
  args: { defaultTab: "keys" },
  globals: { viewport: { value: "laptop", isRotated: false } },
}

/** Seven changes already logged, newest first under the tabs. */
export const WithChanges: Story = {
  args: { data: { ...data, settingsChanges: [...data.settingsChanges, ...more] } },
  globals: { viewport: { value: "laptop", isRotated: false } },
}

/** On a phone Settings is a list of its five entries; pressing one opens it with a way back. */
export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** On a phone, one entry open: People, with "Settings" to go back. */
export const PhoneEntry: Story = {
  args: { defaultTab: "people" },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The first change shows the save bar: the count, Discard and Save. */
export const Unsaved: Story = {
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    const name = await canvas.findByRole("textbox", { name: "Tech Two name" })
    await userEvent.clear(name)
    await userEvent.type(name, "Blowout truck{Enter}")
    await expect(await canvas.findByText("1 unsaved change")).toBeInTheDocument()
  },
}
