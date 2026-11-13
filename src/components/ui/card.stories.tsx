import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"

const meta = {
  title: "UI/Card",
  component: Card,
} satisfies Meta<typeof Card>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="m-6 max-w-sm">
      <CardHeader>
        <CardTitle>Season Pass</CardTitle>
        <CardDescription>Three visits on one schedule.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Spring turn-on, a mid-season check and the fall blowout, booked once.</p>
      </CardContent>
    </Card>
  ),
}
