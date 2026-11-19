import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SaveBar } from "./SaveBar"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }
const noop = () => {}

const meta = {
  title: "Blocks/SaveBar",
  component: SaveBar,
  parameters: { layout: "padded" },
  args: { count: 3, onSave: noop, onDiscard: noop },
  globals: LAPTOP,
  decorators: [(Story) => <div className="min-h-40 max-w-3xl"><Story /></div>],
} satisfies Meta<typeof SaveBar>
export default meta
type Story = StoryObj<typeof meta>

/** The first change shows the bar: the count, Discard and Save. */
export const Default: Story = {}

/** Nothing changed and nothing said: no bar. After a save it says "Saved just now". */
export const Empty: Story = { args: { count: 0, message: "Saved just now" } }

/** A problem turns Save off and says why under the count. */
export const Problems: Story = { args: { count: 1, problems: ["Give every person a name before saving."] } }

/** The API refused: its words in the destructive colour. */
export const Refused: Story = { args: { count: 2, message: "Keep at least one owner.", failed: true } }

export const Phone: Story = { globals: PHONE }
