import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { EMPTY_SETTINGS } from "@/lib/admin/empty-settings"
import { AdminShell } from "@/components/blocks/AdminShell"
import { ScheduleScreen } from "./ScheduleScreen"

// `today` is pinned to 12:56 pm Mountain on Thursday, November 12, 2026, the
// same moment as the Home story, so the week is Monday the 9th: Ryan Garner
// carries every visit and two earlier in the week were moved. The map draws from
// OpenFreeMap tiles; without WebGL it shows its fallback.
const TODAY = "2026-11-12T19:56:30Z"
const data = snapshot as AdminData

// Only spring jobs on the calendar: the Schedule opens on the first week that has one, and an empty week points there.
const spring: AdminData = { ...data, visits: data.visits.slice(0, 6).map((v, i) => ({ ...v, startAt: `2027-04-2${7 + (i % 3)}T15:00:00Z`, status: "scheduled" as const, personId: "person_truck-1", personName: "Ryan Garner", stopOrder: i + 1 })) }

const nothingYet: AdminData = {
  organizationId: data.organizationId,
  syncedAt: TODAY,
  clients: [],
  visits: [],
  quotes: [],
  invoices: [],
  passes: [],
  monthTotals: [],
  attention: [],
  settings: EMPTY_SETTINGS,
  settingsChanges: [],
  messages: [],
}

const meta = {
  title: "Screens/Schedule",
  component: ScheduleScreen,
  parameters: { layout: "fullscreen" },
  args: { data, today: TODAY },
  render: (args) => (
    <AdminShell current="schedule" user={{ initials: "HG", name: "Hannah" }}>
      <ScheduleScreen {...args} />
    </AdminShell>
  ),
} satisfies Meta<typeof ScheduleScreen>
export default meta
type Story = StoryObj<typeof meta>

export const Week: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** Opens on the first week that has a job, with the list of jobs that need a day under it. */
export const OpensOnFirstJobWeek: Story = {
  args: { data: spring },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Week of Apr 26\./)).toBeInTheDocument()
  },
}

/** An empty week points at the next week that has jobs. */
export const EmptyWeek: Story = {
  args: { data: spring, defaultWeek: "2026-11-09" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Next jobs:/)).toBeInTheDocument()
  },
}

/** The Day view: Thursday's stops in order, through the same grid as Visits, with the map under them. */
export const Day: Story = {
  args: { defaultTab: "day" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

const firstStop = data.visits.find((v) => v.startAt && v.status === "scheduled")!.id

/** The visit panel open over the week on a laptop: the week keeps its seven columns and does not move; the panel is an overlay. */
export const PanelOpen: Story = {
  args: { defaultVisitId: firstStop, defaultSelectedId: firstStop },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** The same panel on a phone: a full width sheet over the day list. */
export const PanelOpenPhone: Story = {
  args: { defaultVisitId: firstStop },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const NoDataYet: Story = {
  args: { data: nothingYet },
  globals: { viewport: { value: "wide", isRotated: false } },
}

export const Tablet: Story = {
  globals: { viewport: { value: "tablet", isRotated: false } },
}

/** On a phone the Week view is one day at a time with the people stacked. */
export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The List view, the old Visits grid: the same columns and filters, a row opens the visit in the panel. */
export const List: Story = {
  args: { defaultTab: "list" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("radio", { name: "List" })).toBeChecked()
    await expect(canvas.queryByRole("tab")).not.toBeInTheDocument()
  },
}

/** The "+" on a week column header opens New job with that day at the top and filled in. */
export const NewJobFromAWeekDay: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    const plus = (await canvas.findAllByRole("button", { name: /^New job on Wed/ }))[0]!
    await userEvent.click(plus)
    const sheet = within(await within(document.body).findByRole("dialog"))
    await expect(sheet.getByText(/^Wednesday, /)).toBeInTheDocument()
  },
}

/** The Day view's header has New job too, with that day filled in. */
export const NewJobFromTheDay: Story = {
  args: { defaultTab: "day", defaultDay: "2026-11-12" },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    const day = (await canvas.findByRole("radio", { name: "Day" })).closest("[data-slot=schedule-screen]")!
    await userEvent.click(within(day.querySelector<HTMLElement>("[data-slot=schedule-day]")!).getByRole("button", { name: "New job" }))
    const sheet = within(await within(document.body).findByRole("dialog"))
    await expect(sheet.getByText("Thursday, Nov 12")).toBeInTheDocument()
  },
}
