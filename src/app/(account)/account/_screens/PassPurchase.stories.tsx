import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { AccountNav } from "@/components/blocks/AccountNav"
import { PassPageScreen } from "../pass/_screens/PassPageScreen"
import { andrea, passJob, repairJob, visit } from "./account-fixtures"
import { HomeScreen } from "./HomeScreen"
import { aprilPass, aprilTimes, januaryPass } from "./pass-purchase-fixtures"

// A Season Pass in the customer's account right after buying (docs/plans/2026-11-20-season-pass-booking-research.md, Hannah's decisions of Nov 20 2026), at 375 and 1280. After an April purchase the next
// visit has its exact day and time and the other visit shows "Preference: Early season, early October" with a Change control, the sentence about scheduling once under the list. After a January
// purchase both visits show a preference and no day. Home shows the pass card and the next visit; the plan lines live on the Season Pass tab only. Stories open still; each play is in a hidden twin (`!dev`, `!autodocs`).
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
    (Story, { name }) => (
      <div className="min-h-svh bg-stone">
        <AccountNav firstName="Andrea" current={name.startsWith("PassPage") ? "/account/pass" : "/account"} />
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

const HIDDEN = ["!dev", "!autodocs"]

/** April: Home shows the pass card and the next visit; the plan's lines, with preferences and Change, live only on the Season Pass tab. */
export const HomeAprilPhone: Story = { ...phone, render: homeApril }
export const HomeAprilLaptop: Story = { ...laptop, render: homeApril }
export const HomeAprilPlay: Story = {
  tags: HIDDEN,
  ...phone,
  render: homeApril,
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector("[data-slot=pass-visit-rows]")).toBeNull()
    await expect(canvasElement.querySelector("[data-slot=season-line]")).toBeNull()
  },
}
/** January: both visits have a preference and no day; Home shows the card and no visit. */
export const HomeJanuaryPhone: Story = { ...phone, render: homeJanuary }
export const HomeJanuaryLaptop: Story = { ...laptop, render: homeJanuary }

/** The Season Pass tab after the April purchase: the next visit exact, the blowout with its timing and a Change control. */
export const PassPageAprilPhone: Story = { ...phone, render: passApril }
export const PassPageAprilLaptop: Story = { ...laptop, render: passApril }
export const PassPageAprilPlay: Story = {
  tags: HIDDEN,
  ...phone,
  render: passApril,
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement.querySelector("[data-slot=pass-visit-rows]") as HTMLElement)
    await expect(rows.getByText("Preference: Early season, early October")).toBeInTheDocument()
    await expect(rows.getByText(/Wednesday, April 28 at 10:30 am/)).toBeInTheDocument()
    await expect(rows.getByRole("button", { name: /Change: your fall blowout/ })).toBeInTheDocument()
    await expect(within(canvasElement).getAllByText("We'll schedule it about two weeks before and tell you the day.")).toHaveLength(1)
  },
}
/** The Season Pass tab after the January purchase: two timings, each with Change, no day yet. */
export const PassPageJanuaryPhone: Story = { ...phone, render: passJanuary }
export const PassPageJanuaryLaptop: Story = { ...laptop, render: passJanuary }
export const PassPageJanuaryPlay: Story = {
  tags: HIDDEN,
  ...phone,
  render: passJanuary,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getAllByRole("button", { name: /Change: your/ })).toHaveLength(2)
  },
}
