import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { Button } from "./button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet"

const meta = {
  title: "UI/Sheet",
  component: Sheet,
} satisfies Meta<typeof Sheet>
export default meta
type Story = StoryObj<typeof meta>

const DETAIL = [
  ["Town", "Erie"],
  ["Zones", "6"],
  ["Blowout week", "October 5"],
  ["Status", "confirmed"],
]

export const Right: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline" className="m-6">
          Open pass
        </Button>
      </SheetTrigger>
      {/* Full width on a phone, a 480px side panel from lg. */}
      <SheetContent side="right" className="w-full sm:max-w-none lg:max-w-[30rem]">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Megan</SheetTitle>
          <SheetDescription>Season Pass, three visits on one schedule.</SheetDescription>
        </SheetHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 px-4 text-sm">
          {DETAIL.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-muted-foreground">{term}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
}

export const Bottom: Story = {
  render: () => (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline" className="m-6">
          Filter
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Filter passes</SheetTitle>
          <SheetDescription>Show the passes for one blowout week.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-wrap gap-2 px-4 pb-4">
          {["October 5", "October 12", "October 19", "October 26"].map((week) => (
            <Button key={week} variant="outline" size="sm">
              {week}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  ),
}
