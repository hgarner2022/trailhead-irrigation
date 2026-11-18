import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"
import { TodayGroup } from "./TodayGroup"
import { TodayVisitRow } from "./TodayVisitRow"

const row = (id: string, firstName: string, window: string) => (
  <TodayVisitRow key={id} id={id} window={window} firstName={firstName} town="Erie" service="Repair" personName="Ryan Garner" initials="RG" areaIndex={0} work="scheduled" workLabel="Scheduled" money="not-yet" moneyWord="" onOpen={fn()} />
)

const meta = {
  title: "Blocks/TodayGroup",
  component: TodayGroup,
  parameters: { layout: "padded" },
  args: { group: "ahead", count: 2 },
} satisfies Meta<typeof TodayGroup>
export default meta
type Story = StoryObj<typeof meta>

/** "2 ahead today" over its rows. */
export const Ahead: Story = { render: (args) => <TodayGroup {...args}>{[row("a", "Percy", "1 to 3 pm"), row("b", "Alicia", "3 to 5 pm")]}</TodayGroup> }

/** "2 past their window", the heading in the warning colour. */
export const Past: Story = { args: { group: "past", count: 2 }, render: (args) => <TodayGroup {...args}>{[row("a", "Percy", "8 to 10 am"), row("b", "Alicia", "10 am to 12 pm")]}</TodayGroup> }

/** "1 past its window": one reads in the singular. */
export const PastOne: Story = { args: { group: "past", count: 1 }, render: (args) => <TodayGroup {...args}>{row("a", "Percy", "8 to 10 am")}</TodayGroup> }

/** A group with nothing in it says "Nothing here" in muted text. */
export const Empty: Story = { args: { group: "done", count: 0 } }
