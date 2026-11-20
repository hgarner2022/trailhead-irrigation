import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ReviewGuide } from "./ReviewGuide"

// The first page in the sidebar. A Docs page only: the one story is hidden from the sidebar and kept so the page renders under the story tests.

const meta = {
  title: "Start here",
  component: ReviewGuide,
  parameters: {
    layout: "fullscreen",
    docs: {
      page: ReviewGuide,
      description: { component: "The review guide: the admin and the customer side in the order to walk them, a line on what to look at in each, and what changed since the last review." },
    },
  },
} satisfies Meta<typeof ReviewGuide>
export default meta
type Story = StoryObj<typeof meta>

/** The guide itself. */
export const Guide: Story = { tags: ["!dev"] }
