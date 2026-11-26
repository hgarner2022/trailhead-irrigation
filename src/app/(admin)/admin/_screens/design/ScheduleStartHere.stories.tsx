import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ScheduleStartHere } from "./ScheduleStartHere"

// A Docs page only, next to the Schedule prototype stories: the one story is hidden from the sidebar and kept so the page renders under the story tests.

const meta = {
  title: "Screens/Start here: Scheduler (Nov 26)",
  component: ScheduleStartHere,
  parameters: {
    layout: "fullscreen",
    docs: {
      page: ScheduleStartHere,
      description: { component: "What to look at in the new Schedule, what to try, and the three things to confirm." },
    },
  },
} satisfies Meta<typeof ScheduleStartHere>
export default meta
type Story = StoryObj<typeof meta>

/** The guide itself. */
export const Guide: Story = { tags: ["!dev"] }
