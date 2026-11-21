import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { AccountNav } from "@/components/blocks/AccountNav"
import { PassPageScreen } from "../pass/_screens/PassPageScreen"
import { andrea, passJob, repairJob, visit } from "./account-fixtures"
import { HomeScreen } from "./HomeScreen"
import { aprilPass, aprilTimes, januaryPass } from "./pass-purchase-fixtures"

// A Season Pass in the customer's account right after buying (docs/plans/2026-11-20-season-pass-booking-research.md, Hannah's decisions of Nov 20 2026), at 375 and 1280. After an April purchase the next
// visit has its exact day and time and the other visit shows "Preference: Early October. We'll schedule it about two weeks before and tell you the day." with a Change control. After a January
// purchase both visits show a preference and no day. Home and the Season Pass page read the same rows.
const phone = { globals: { viewport: { value: "phone", isRotated: false } } } as const
const laptop = { globals: { viewport: { value: "laptop", isRotated: false } } } as const
const onChangePreference = fn()

const januaryJob = {
  ...passJob,
  visits: [visit({ id: "v1", kind: "turn-on", name: "Spring turn-on", status: "unscheduled", month: "May", price: 165 }), visit({ id: "v2", kind: "blowout", name: "Fall blowout", status: "unscheduled", month: "October", price: 115 })],
}

const meta = {
  title: "Screens/Account, Season Pass purchase",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="min-h-svh bg-cream">
        <AccountNav firstName="Andrea" current="/account" />
        <Story />
      </div>
    ),
  ],
} satisfies Meta
export default meta
type Story = StoryObj

const homeApril = () => <HomeScreen customer={andrea} jobs={[passJob, repairJob]} today="2027-04-14" pass={aprilPass} times={aprilTimes} />
const homeJanuary = () => <HomeScreen customer={andrea} jobs={[januaryJob, repairJob]} today="2027-01-12" pass={januaryPass} />
const passApril = () => <PassPageScreen pass={aprilPass} today="2027-04-14" times={aprilTimes} onChangePreference={onChangePreference} />
const passJanuary = () => <PassPageScreen pass={januaryPass} today="2027-01-12" onChangePreference={onChangePreference} />

/** April: Home shows the pass card and its timeline; the list of visits with preferences and Change lives only on the Season Pass page. */
export const HomeAprilPhone: Story = {
  ...phone,
  render: homeApril,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-slot=pass-visit-rows]")).toBeNull()
  },
}
export const HomeAprilLaptop: Story = { ...laptop, render: homeApril }
/** January: both visits show a preference and no day. */
export const HomeJanuaryPhone: Story = { ...phone, render: homeJanuary }
export const HomeJanuaryLaptop: Story = { ...laptop, render: homeJanuary }

/** The Season Pass page after the April purchase: the next visit exact, the blowout with its preference and a Change control. */
export const PassPageAprilPhone: Story = {
  ...phone,
  render: passApril,
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement.querySelector("[data-slot=pass-visit-rows]") as HTMLElement)
    await expect(rows.getByText("Preference: Early October")).toBeInTheDocument()
    await expect(rows.getByText("We'll schedule it about two weeks before and tell you the day.")).toBeInTheDocument()
    await expect(rows.getByText(/Wednesday, April 28 at 10:30 am/)).toBeInTheDocument()
    await expect(rows.getByRole("button", { name: /Change when we do your fall blowout/ })).toBeInTheDocument()
  },
}
export const PassPageAprilLaptop: Story = { ...laptop, render: passApril }
/** The Season Pass page after the January purchase: two preferences, each with Change, no day yet. */
export const PassPageJanuaryPhone: Story = {
  ...phone,
  render: passJanuary,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("button", { name: /Change when we do your/ })).toHaveLength(2)
  },
}
export const PassPageJanuaryLaptop: Story = { ...laptop, render: passJanuary }
