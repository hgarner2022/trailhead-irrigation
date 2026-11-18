import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { TodayVisitRow, type TodayVisitRowProps } from "./TodayVisitRow"

const base: TodayVisitRowProps = {
  id: "v1", window: "8 to 10 am", firstName: "Percy", town: "Erie", service: "Fall blowout", personName: "Ryan Garner", initials: "RG", areaIndex: 0,
  work: "scheduled", workLabel: "Scheduled", money: "not-yet", moneyWord: "", onOpen: fn(),
}

const meta = {
  title: "Blocks/TodayVisitRow",
  component: TodayVisitRow,
  parameters: { layout: "padded" },
  args: base,
  render: (args) => (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      <TodayVisitRow {...args} />
    </ul>
  ),
} satisfies Meta<typeof TodayVisitRow>
export default meta
type Story = StoryObj<typeof meta>

/** Ahead of its window: window, name and town over the service, the person's initials, the Scheduled pill and the area's bar. */
export const Scheduled: Story = {}

/** Done and paid: the customer line struck through, "Paid, Venmo" beside the Done pill. */
export const DonePaid: Story = { args: { work: "done", workLabel: "Done", money: "paid", moneyWord: "Paid, Venmo", initials: "TT", personName: "Tech Two", areaIndex: 1 } }

export const DoneOwed: Story = { args: { work: "done", workLabel: "Done", money: "owed", moneyWord: "$95 unpaid", areaIndex: 2 } }

export const DoneBillSent: Story = { args: { work: "done", workLabel: "Done", money: "bill-sent", moneyWord: "Invoice sent" } }

/** By person the row leads with its place in the person's day, the number on the map pin. */
export const WithRoute: Story = { args: { route: 2 } }

/** No window yet and nobody has the visit: "Any time", a question mark in the circle and the quiet bar. */
export const NoWindowNoPerson: Story = { args: { window: "Any time", personName: "No one yet", initials: "", areaIndex: -1 } }

export const Phone: Story = { args: { work: "done", workLabel: "Done", money: "owed", moneyWord: "$145 unpaid" }, globals: { viewport: { value: "phone", isRotated: false } } }
