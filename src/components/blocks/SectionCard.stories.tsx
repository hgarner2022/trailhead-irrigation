import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { RecordFacts } from "./RecordPanel"
import { SectionCard } from "./SectionCard"

const meta = {
  title: "Blocks/SectionCard",
  component: SectionCard,
  parameters: { layout: "padded" },
  globals: { viewport: { value: "laptop", isRotated: false } },
  decorators: [(Story) => <div className="max-w-xl bg-cream p-6"><Story /></div>],
  args: {
    title: "Property",
    id: "property",
    action: <button type="button" className="min-h-11 text-primary-dark underline-offset-2 hover:underline">Edit</button>,
    children: <RecordFacts divided rows={[["Gate code", "4417"], ["Must be home", "No"], ["Access note", "Side gate by the garage, dog is friendly."]]} />,
  },
} satisfies Meta<typeof SectionCard>
export default meta
type Story = StoryObj<typeof meta>

/** A white card on the cream canvas: a title bar with its action, a hairline, then the body. */
export const Default: Story = {}

/** A card with nothing to show keeps its title and says what will be there. */
export const Empty: Story = { args: { action: undefined, children: <p className="text-sm text-muted-foreground">No invoice or payment yet.</p> } }

/** On a phone the card fills the width of the page gutters. */
export const Phone: Story = { globals: { viewport: { value: "phone", isRotated: false } } }
