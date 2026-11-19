import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { AdminShell } from "@/components/blocks/AdminShell"
import { CustomerPage } from "./CustomerPage"
import { STATE_NOTES, customerPageOf, type CustomerState } from "./customer-fixtures"

// The customer page on the job page's frame, at 1280 (Laptop) and 375 (Phone): a pass holder with an open job and an unpaid invoice, a
// two-season customer (the renewal chain), a one-off customer (Get a Season Pass), a lapsed pass (Reserve next season), a customer with
// nothing yet, a card expiring, and the Send a text dialog open. Pure screens over fixtures: no handlers, no API.

const meta = {
  title: "Design/Customer page",
  component: CustomerPage,
  parameters: { layout: "fullscreen" },
  args: { customer: customerPageOf("pass-holder") },
  render: (args) => (
    <AdminShell current="customers" user={{ initials: "HG", name: "Hannah" }}>
      <CustomerPage {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof CustomerPage>
export default meta
type Story = StoryObj<typeof meta>

const laptop = { viewport: { value: "laptop", isRotated: false } }
const phone = { viewport: { value: "phone", isRotated: false } }
const story = (state: CustomerState, globals: typeof laptop, initialDialog?: "text"): Story => ({ args: { customer: customerPageOf(state), initialDialog }, globals, parameters: { docs: { description: { story: STATE_NOTES[state] } } } })

export const PassHolder: Story = story("pass-holder", laptop)
export const PassHolderPhone: Story = story("pass-holder", phone)
export const TwoSeasons: Story = story("two-seasons", laptop)
export const TwoSeasonsPhone: Story = story("two-seasons", phone)
export const OneOff: Story = story("one-off", laptop)
export const OneOffPhone: Story = story("one-off", phone)
export const ReserveNextSeason: Story = story("reserve-next", laptop)
export const ReserveNextSeasonPhone: Story = story("reserve-next", phone)
export const NothingYet: Story = story("nothing-yet", laptop)
export const NothingYetPhone: Story = story("nothing-yet", phone)
export const CardExpiring: Story = story("card-expiring", laptop)
export const CardExpiringPhone: Story = story("card-expiring", phone)
export const SendATextDialog: Story = story("pass-holder", laptop, "text")
export const SendATextDialogPhone: Story = story("pass-holder", phone, "text")
