import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { MapPin, User } from "lucide-react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command"

const meta = {
  title: "UI/Command",
  component: Command,
} satisfies Meta<typeof Command>
export default meta
type Story = StoryObj<typeof meta>

const CUSTOMERS = [
  ["Megan", "Erie"],
  ["Derek", "Longmont"],
  ["Priya", "Louisville"],
  ["Tom", "Lafayette"],
]
const TOWNS = ["Erie", "Longmont", "Louisville", "Lafayette", "Firestone", "Broomfield"]

export const Default: Story = {
  render: () => (
    <Command label="Search customers and towns" className="m-6 max-w-md rounded-lg border border-border shadow-md">
      <CommandInput placeholder="Search customers and towns" />
      <CommandList>
        <CommandEmpty>Nothing matches that search.</CommandEmpty>
        <CommandGroup heading="Customers">
          {CUSTOMERS.map(([name, town]) => (
            <CommandItem key={name} value={`${name} ${town}`}>
              <User />
              <span>{name}</span>
              <span className="ml-auto text-xs text-foreground/70">{town}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Towns">
          {TOWNS.map((town) => (
            <CommandItem key={town} value={town}>
              <MapPin />
              <span>{town}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  ),
}
