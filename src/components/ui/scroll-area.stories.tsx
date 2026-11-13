import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ScrollArea } from "./scroll-area"

const meta = {
  title: "UI/ScrollArea",
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>
export default meta
type Story = StoryObj<typeof meta>

const HOLDERS = [
  ["Megan", "Erie"],
  ["Derek", "Longmont"],
  ["Priya", "Louisville"],
  ["Tom", "Lafayette"],
  ["Alison", "Firestone"],
  ["Carlos", "Broomfield"],
  ["Jen", "Erie"],
  ["Marcus", "Longmont"],
  ["Sophie", "Louisville"],
  ["Ben", "Lafayette"],
  ["Rachel", "Firestone"],
  ["Luis", "Broomfield"],
]

export const Default: Story = {
  render: () => (
    <ScrollArea className="m-6 h-48 w-64 rounded-lg border border-border bg-card">
      <ul className="p-3 text-sm">
        {HOLDERS.map(([name, town]) => (
          <li key={name} className="flex justify-between border-b border-border py-2 last:border-0">
            <a href="#" className="font-medium text-primary-dark underline-offset-4 hover:underline">
              {name}
            </a>
            <span className="text-muted-foreground">{town}</span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  ),
}
