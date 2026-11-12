import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { Pass } from "@/lib/admin/types"
import { PassPageScreen } from "./PassPageScreen"

// passes[0] is Andrea in Erie with the turn-on done and the blowout reserved
// for the week of October 4. `today` sits before the 2027 season for Active
// and after it for AllDone.
const passes = snapshot.passes as Pass[]
const active = passes[0]
const allDone: Pass = {
  ...active,
  visits: active.visits.map((v, i) => ({
    ...v,
    scheduledAt: v.scheduledAt ?? ["2027-04-20T16:00:00Z", "2027-07-13T15:00:00Z", "2027-10-05T16:00:00Z"][i],
    completedAt: ["2027-04-20T17:10:00Z", "2027-07-13T16:05:00Z", "2027-10-05T16:40:00Z"][i],
    chargedAt: ["2027-04-20T17:12:00Z", "2027-07-13T16:07:00Z", "2027-10-05T16:42:00Z"][i],
  })),
}
const cancelled: Pass = { ...active, status: "cancelled" }

const meta = {
  title: "Screens/PassPage",
  component: PassPageScreen,
  parameters: { layout: "fullscreen" },
  args: { pass: active, today: "2026-11-12" },
} satisfies Meta<typeof PassPageScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Active: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const AllDone: Story = {
  args: { pass: allDone, today: "2027-11-01" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Cancelled: Story = {
  args: { pass: cancelled },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
