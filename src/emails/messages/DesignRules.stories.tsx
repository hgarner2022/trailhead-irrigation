import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { DesignRules } from "./DesignRules"

// How any Trailhead email is laid out: the anatomy, ten rules with their sources, the colour and type tables with computed contrast, and do's and don'ts.

const meta = {
  title: "Messages/Design rules",
  component: DesignRules,
  parameters: {
    layout: "fullscreen",
    docs: {
      page: DesignRules,
      description: { component: "The layout every email follows, the rules behind it and what the research could not confirm." },
    },
  },
} satisfies Meta<typeof DesignRules>
export default meta
type Story = StoryObj<typeof meta>

/** The rules page. */
export const Rules: Story = { globals: { viewport: { value: "laptop", isRotated: false } } }
