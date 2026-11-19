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

// Percy's Thursday blowout was moved to a must-be-home property: Waiting on customer on the week block and on the day's stop, until they answer.
const waiting: AdminData = { ...data, visits: data.visits.map((v) => (v.clientName === "Percy" && v.startAt?.startsWith("2026-11-12") ? { ...v, waiting: true, timeBooked: true } : v)) }

/** A moved visit that asked the customer to reply YES reads Waiting on customer in the week and in the day. */
export const WaitingOnCustomer: Story = {
  args: { data: waiting },
  globals: { viewport: { value: "wide", isRotated: false } },
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText("Waiting on customer")).length).toBeGreaterThan(0)
  },
}

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

// Step 3 of the admin build (docs/plans/2026-11-18-admin-holistic-design.md, 5.2): the Schedule for one person and for two, at 1280 and at 375.
// One person is the same snapshot with the second truck taken off the schedule (no label, no row). Two people use the October weeks, when both are out.
const onePerson: AdminData = { ...data, settings: { ...data.settings, people: data.settings.people.map((p) => (p.id === "person_truck-2" ? { ...p, truck: undefined } : p)) } }
const noTray: AdminData = { ...data, passes: [], visits: data.visits.filter((v) => v.startAt) }
const rowNames = (canvas: { getAllByRole: (r: string) => HTMLElement[] }) => canvas.getAllByRole("rowheader").map((h) => h.textContent)

/** One person at 1280: a row, their colour, every day headed by its fill and its towns, the Unscheduled list under it with Place on each row and a quiet Schedule all. */
export const OnePersonLaptop: Story = {
  args: { data: onePerson },
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(rowNames(canvas as never)).toEqual(["Ryan Garner"])
    await expect(await canvas.findByRole("button", { name: /^Schedule all \d+$/ })).toBeInTheDocument()
  },
}

/** One person at 375: one day at a time, the day's fill and towns under its name, the list below. */
export const OnePersonPhone: Story = {
  args: { data: onePerson },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** Two people at 1280: a row each in their own colour, and every day's header counts both. */
export const TwoPeopleLaptop: Story = {
  args: { defaultWeek: "2026-10-12" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(rowNames(canvas as never)).toEqual(["Ryan Garner", "Tech Two"])
    await expect((await canvas.findAllByText(/stops, .* open|stops, full/)).length).toBeGreaterThan(3)
  },
}

/** Two people at 375: the day's people stacked, each with their stops. */
export const TwoPeoplePhone: Story = {
  args: { defaultWeek: "2026-10-12" },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The Day view with two people at 1280: each person's numbered stops in their colour beside one map. */
export const DayTwoPeopleLaptop: Story = {
  args: { defaultTab: "day", defaultDay: "2026-10-13" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("region", { name: "Ryan Garner" })).toBeInTheDocument()
    await expect(await canvas.findByRole("region", { name: "Tech Two" })).toBeInTheDocument()
  },
}

export const DayTwoPeoplePhone: Story = {
  args: { defaultTab: "day", defaultDay: "2026-10-13" },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The Unscheduled list with every job placed: "Every job has a day." and no Schedule all. */
export const UnscheduledEmpty: Story = {
  args: { data: noTray },
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Every job has a day.")).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /^Schedule all/ })).not.toBeInTheDocument()
  },
}

export const UnscheduledEmptyPhone: Story = {
  args: { data: noTray },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The Unscheduled list full, one person at 375: the list under the day, Place on each row. */
export const UnscheduledFullPhone: Story = {
  args: { data: onePerson },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** Schedule all opens the preview: who goes on which day with which person, then one button; the customers are texted a minute later. */
export const PlaceAllPreview: Story = {
  args: { data: onePerson, textDelaySeconds: 60 },
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Schedule all \d+$/ }))
    const dialog = within(await within(document.body).findByRole("dialog"))
    await expect(dialog.getByRole("heading", { name: /^Schedule all \d+$/ })).toBeInTheDocument()
    await expect(dialog.getAllByText(/Ryan Garner · Any time$/).length).toBeGreaterThan(0)
  },
}

/** Place on one row books it on the screen at once; the customer's text waits a minute under "Texting Andrea in 60 s. Undo". */
export const PlaceOneWithUndoStrip: Story = {
  args: { data: onePerson, textDelaySeconds: 60 },
  globals: { viewport: { value: "laptop", isRotated: false } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click((await canvas.findAllByRole("button", { name: /^Schedule [A-Z]/ }))[0]!)
    await expect(await canvas.findByText(/^Texting .* in/)).toBeInTheDocument()
    await expect(await canvas.findByRole("button", { name: "Undo" })).toBeInTheDocument()
  },
}

/** The List view on a phone: each visit is one card with the customer, service, status, day, time, who and the money word. */
export const ListPhone: Story = {
  args: { defaultTab: "list" },
  globals: { viewport: { value: "phone", isRotated: false } },
}

/** The List view on a phone with no visits yet. */
export const ListEmptyPhone: Story = {
  args: { defaultTab: "list", data: nothingYet },
  globals: { viewport: { value: "phone", isRotated: false } },
}
