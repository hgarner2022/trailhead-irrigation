import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { SectionHeading } from "./SectionHeading"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const meta = {
  title: "Blocks/SectionHeading",
  component: SectionHeading,
  parameters: { layout: "padded" },
  args: { id: "property", children: "Property" },
  globals: LAPTOP,
} satisfies Meta<typeof SectionHeading>
export default meta
type Story = StoryObj<typeof meta>

/** A section of a record panel: Barlow Condensed 18px, navy, an h3. */
export const Default: Story = {
  render: (args) => (
    <section aria-labelledby="property" className="max-w-md">
      <SectionHeading {...args} action={<a href="#edit" className="text-primary-dark underline underline-offset-2">Edit</a>} />
      <p className="mt-2 text-sm">1450 Main St, Erie</p>
    </section>
  ),
}

/** The title of a card on a screen: an h2 at 24px, no action. */
export const Empty: Story = { args: { level: 2, children: "Revenue by month" } }

export const Phone: Story = { ...Default, globals: PHONE }
