import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import snapshot from "@/lib/admin/fixtures/snapshot.json"
import type { AdminData } from "@/lib/admin/types"
import { TIME_ZONE } from "@/lib/admin/format"
import { moveVisit } from "@/app/(admin)/admin/_screens/schedule-model"
import { WeekGrid } from "./WeekGrid"

// The week of Monday, November 9, 2026 from the snapshot: Ryan Garner carries
// every visit, two moved in
// Jobber earlier in the week; the second truck is idle until October. Today is the
// Thursday. The stateful wrapper lets a visit be selected and dragged.
const data = snapshot as AdminData
const TODAY = "2026-11-12"
const WEEK = "2026-11-09"

function Live(props: Omit<React.ComponentProps<typeof WeekGrid>, "selectedId" | "onSelect" | "onMove" | "onWeekChange" | "weekStart"> & { weekStart: string }) {
  const [visits, setVisits] = useState(props.visits)
  const [selectedId, setSelectedId] = useState<string>()
  const [weekStart, setWeekStart] = useState(props.weekStart)
  return (
    <WeekGrid
      {...props}
      visits={visits}
      weekStart={weekStart}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onMove={(id, personId, day) => setVisits((v) => moveVisit(v, id, personId, day, props.people, TIME_ZONE))}
      onWeekChange={setWeekStart}
    />
  )
}

const meta = {
  title: "Blocks/WeekGrid",
  component: WeekGrid,
  parameters: { layout: "padded" },
  args: {
    people: data.settings.people,
    areas: data.settings.areas,
    visits: data.visits,
    weekStart: WEEK,
    today: TODAY,
    timeZone: TIME_ZONE,
    onSelect: () => {},
    onMove: () => {},
    onWeekChange: () => {},
  },
  render: (args) => <Live {...args} />,
} satisfies Meta<typeof WeekGrid>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** An October week, when both people are out and the days are full. */
export const TwoPeople: Story = {
  args: { weekStart: "2026-10-05", today: "2026-10-08" },
  globals: { viewport: { value: "wide", isRotated: false } },
}

/** One person on the schedule: a single row in their colour, every day's header still counting stops and towns. */
export const OnePerson: Story = {
  args: { people: data.settings.people.slice(0, 1), visits: data.visits.filter((v) => v.personId === data.settings.people[0]!.id) },
  globals: { viewport: { value: "laptop", isRotated: false } },
}

export const OnePersonPhone: Story = {
  args: { people: data.settings.people.slice(0, 1), visits: data.visits.filter((v) => v.personId === data.settings.people[0]!.id) },
  globals: { viewport: { value: "phone", isRotated: false } },
}

export const Empty: Story = {
  args: { people: [], areas: [] },
}

/** Under `md` the grid becomes one day with the people stacked. */
export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
}
