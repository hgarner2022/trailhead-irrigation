import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Overview } from "./Overview"

// Every message a customer (or the crew) can get, in one table with a link to each story. A Docs page and a story, both the same table.

const meta = {
  title: "Messages/Overview",
  component: Overview,
  parameters: {
    layout: "fullscreen",
    docs: {
      page: Overview,
      description: { component: "One table of every message: when it is sent, its channel, transactional or marketing, built or prototype, and a link to its story." },
    },
  },
} satisfies Meta<typeof Overview>
export default meta
type Story = StoryObj<typeof meta>

/** The table. */
export const Table: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
