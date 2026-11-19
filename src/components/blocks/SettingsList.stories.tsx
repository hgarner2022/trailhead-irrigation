import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FormRow } from "./FormRow"
import { SettingsList } from "./SettingsList"

const LAPTOP = { viewport: { value: "laptop", isRotated: false } }
const PHONE = { viewport: { value: "phone", isRotated: false } }

const row = (id: string, name: string, email: string) => ({
  id,
  title: name,
  subtitle: email,
  aside: <Button variant="ghost" size="sm">Remove</Button>,
  children: (
    <>
      <FormRow label="Name" inline>
        <Input className="min-h-11" defaultValue={name} />
      </FormRow>
      <FormRow label="Email" inline hint="How they sign in">
        <Input className="min-h-11" defaultValue={email} />
      </FormRow>
    </>
  ),
})

const meta = {
  title: "Blocks/SettingsList",
  component: SettingsList,
  parameters: { layout: "padded" },
  args: {
    title: "People",
    description: "Who works here and how they are scheduled.",
    action: <Button variant="outline">Add person</Button>,
    rows: [row("p1", "Ryan Garner", "ryan@example.com"), row("p2", "Sam Torres", "sam@example.com")],
    changes: [{ id: "c1", at: "2026-11-12T19:56:30Z", who: "Hannah", field: "Sam Torres role", from: "Tech", to: "Admin" }],
  },
  globals: LAPTOP,
} satisfies Meta<typeof SettingsList>
export default meta
type Story = StoryObj<typeof meta>

/** One row per person, the facts in two columns with 112px labels, the change log under the list. */
export const Default: Story = {}

/** No rows: the entry's empty state, and an empty log. */
export const Empty: Story = { args: { rows: [], changes: [], empty: { title: "No people yet", line: "Add a person and the Schedule has someone to give visits to." } } }

/** On a phone the label sits above its control and the facts run in one column. */
export const Phone: Story = { globals: PHONE }
