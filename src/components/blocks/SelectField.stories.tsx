import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { FormRow } from "./FormRow"
import { SelectField } from "./SelectField"

// The one native select of the admin: 44px, 16px text on a phone, the shared focus ring. Use it inside `FormRow`.
const meta = { title: "Blocks/SelectField", component: SelectField, parameters: { layout: "padded" } } satisfies Meta<typeof SelectField>
export default meta
type Story = StoryObj<typeof meta>

export const Fields: Story = {
  render: () => (
    <div className="flex max-w-sm flex-col gap-4">
      <FormRow label="Who">
        <SelectField defaultValue="ryan">
          <option value="ryan">Ryan Garner</option>
          <option value="tech">Tech Two</option>
        </SelectField>
      </FormRow>
      <FormRow label="Compact (a Settings row)">
        <SelectField density="compact" defaultValue="tech">
          <option value="tech">Tech</option>
          <option value="admin">Admin</option>
        </SelectField>
      </FormRow>
      <FormRow label="Disabled">
        <SelectField disabled defaultValue="a">
          <option value="a">No one yet</option>
        </SelectField>
      </FormRow>
      <FormRow label="With a problem" error="Pick one.">
        <SelectField invalid defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          <option value="a">Spring turn-on</option>
        </SelectField>
      </FormRow>
    </div>
  ),
}

export const Phone: Story = { ...Fields, globals: { viewport: { value: "phone", isRotated: false } } }
