import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { AdminShell } from "@/components/blocks/AdminShell"
import { OctoberScreen } from "./OctoberScreen"

// The four October weeks of 2027 from the snapshot, 20 spots each. FullWeek
// fills the second week so the Full chip and the warning number show;
// OverCapacity lowers the second week's capacity under its three reservations.
const data = snapshot as AdminData

const nothingYet: AdminData = {
  organizationId: data.organizationId,
  syncedAt: data.syncedAt,
  clients: [],
  visits: [],
  quotes: [],
  invoices: [],
  passes: [],
  blowoutWeeks: [],
  monthTotals: [],
  attention: [],
}

const oneFull: AdminData = {
  ...data,
  blowoutWeeks: data.blowoutWeeks.map((w, i) => (i === 1 ? { ...w, taken: w.capacity } : w)),
}

const overCapacity: AdminData = {
  ...data,
  blowoutWeeks: data.blowoutWeeks.map((w, i) => (i === 1 ? { ...w, capacity: 1 } : w)),
}

const meta = {
  title: "Screens/October",
  component: OctoberScreen,
  parameters: { layout: "fullscreen" },
  args: { data },
  render: (args) => (
    <AdminShell current="october" user={{ initials: "HG", name: "Hannah" }}>
      <OctoberScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof OctoberScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The cards in their editable form, as after a click on Edit capacity. */
export const Editing: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Edit capacity" }))
  },
}

export const FullWeek: Story = {
  args: { data: oneFull },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const OverCapacity: Story = {
  args: { data: overCapacity },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const NoDataYet: Story = {
  args: { data: nothingYet },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
