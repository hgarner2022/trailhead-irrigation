import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "./CardTitleHeading"

const meta = {
  title: "Blocks/CardTitleHeading",
  component: CardTitleHeading,
  parameters: { layout: "padded" },
  args: { children: "Revenue by month" },
} satisfies Meta<typeof CardTitleHeading>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** As it sits on a screen: inside a CardHeader with a description under it. */
export const InCard: Story = {
  render: (args) => (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitleHeading {...args} />
        <CardDescription>Paid invoices by issue month, 2026 against 2025.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">The content of the card goes here.</p>
      </CardContent>
    </Card>
  ),
}

export const Phone: Story = {
  globals: { viewport: { value: "phone", isRotated: false } },
  render: (args) => (
    <div className="w-[360px] max-w-full">
      <Card>
        <CardHeader>
          <CardTitleHeading {...args} />
        </CardHeader>
      </Card>
    </div>
  ),
}
