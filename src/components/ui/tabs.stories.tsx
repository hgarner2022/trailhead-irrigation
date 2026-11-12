import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

const meta = {
  title: "UI/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="all" className="m-6 max-w-md">
      <TabsList>
        <TabsTrigger value="all">All passes</TabsTrigger>
        <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
        <TabsTrigger value="past-due">Past due</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="text-sm">
        Every pass sold this season, across all six towns.
      </TabsContent>
      <TabsContent value="confirmed" className="text-sm">
        Passes with a blowout date on the calendar.
      </TabsContent>
      <TabsContent value="past-due" className="text-sm">
        Passes with an invoice that is past its due date.
      </TabsContent>
    </Tabs>
  ),
}

export const Line: Story = {
  render: () => (
    <Tabs defaultValue="revenue" className="m-6 max-w-md">
      <TabsList variant="line">
        <TabsTrigger value="revenue">Revenue</TabsTrigger>
        <TabsTrigger value="visits">Visits</TabsTrigger>
      </TabsList>
      <TabsContent value="revenue" className="text-sm">
        Whole dollars by month, this year against last.
      </TabsContent>
      <TabsContent value="visits" className="text-sm">
        Visits completed by week.
      </TabsContent>
    </Tabs>
  ),
}
