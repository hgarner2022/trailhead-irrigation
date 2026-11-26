"use client"

import { useState } from "react"
import { Check, ChevronDown, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Person } from "@/lib/admin/types"
import { cn } from "@/lib/utils"
import { matchPeople, peopleSummary, SEARCH_FROM } from "./people-menu-model"
import { personStyle } from "./time-grid-style"
import { useMedia } from "./use-media"

// The one person control of the Schedule (docs/plans/2026-11-26-scheduler-review-research.md, point 1): a People button that says who is showing ("Everyone", "Ryan", "3 of 12") and opens a
// checkbox list, a colour dot, the full name and a tick, the same for two people and for fifteen; a search box inside from 8 people. Hiding a person is a view, not a rule: it takes their
// column, stops, pins and rows off the screen and nothing else. The last person shown cannot be turned off. With one person nothing is drawn. On a phone the list is a bottom sheet with 44px
// rows and a Done button. The host holds the set and keeps it in this browser. Pure render.

const ROW = "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-left text-sm text-foreground hover:bg-stone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 aria-disabled:cursor-not-allowed"

export interface PeopleMenuProps {
  /** everyone on the schedule, in colour order */
  people: readonly Person[]
  /** the ids that are hidden */
  hidden: readonly string[]
  onToggle: (personId: string) => void
  className?: string
}

function List({ people, hidden, onToggle }: Pick<PeopleMenuProps, "people" | "hidden" | "onToggle">) {
  const [query, setQuery] = useState("")
  const shownCount = people.filter((p) => !hidden.includes(p.id)).length
  const rows = matchPeople(people, query)
  return (
    <div className="flex min-h-0 flex-col gap-2">
      {people.length >= SEARCH_FROM && <Input type="search" aria-label="Find a person" placeholder="Find a person" value={query} onChange={(e) => setQuery(e.target.value)} className="min-h-11" />}
      <div role="group" aria-label="People shown" data-slot="people-list" className="max-h-[22rem] overflow-y-auto">
        {rows.map((p) => {
          const on = !hidden.includes(p.id)
          const last = on && shownCount === 1
          return (
            <button key={p.id} type="button" role="checkbox" aria-checked={on} aria-disabled={last || undefined} title={last ? "One person always stays on" : undefined} onClick={() => !last && onToggle(p.id)} className={ROW}>
              <span aria-hidden className={cn("size-3 shrink-0 rounded-full", personStyle(people.indexOf(p)).dot, !on && "opacity-40")} />
              <span className={cn("min-w-0 flex-1 truncate", !on && "text-muted-foreground")}>{p.name}</span>
              {on && <Check aria-hidden className="size-4 shrink-0 text-navy" />}
            </button>
          )
        })}
        {rows.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">No one by that name.</p>}
      </div>
    </div>
  )
}

export function PeopleMenu({ people, hidden, onToggle, className }: PeopleMenuProps) {
  const [open, setOpen] = useState(false)
  const phone = useMedia("(max-width: 767px)")
  if (people.length < 2) return null
  const summary = peopleSummary(people, hidden)
  const trigger = (
    <Button type="button" variant="outline" data-slot="people-menu" aria-haspopup="dialog" aria-expanded={open} aria-label={`People: ${summary}`} onClick={phone ? () => setOpen(true) : undefined} className={cn("min-h-11 justify-start gap-2 max-md:w-full", className)}>
      <Users aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 truncate">
        <span className="font-normal text-muted-foreground">People: </span>
        <span className="font-medium">{summary}</span>
      </span>
      <ChevronDown aria-hidden className="ml-auto size-4 shrink-0" />
    </Button>
  )
  if (phone)
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" showCloseButton={false} className="max-h-[85dvh] gap-2 rounded-t-lg p-4" aria-describedby={undefined}>
            <SheetHeader className="p-0">
              <SheetTitle className="font-display text-xl text-navy">People</SheetTitle>
            </SheetHeader>
            <List people={people} hidden={hidden} onToggle={onToggle} />
            <SheetFooter className="p-0">
              <Button type="button" className="min-h-11" onClick={() => setOpen(false)}>Done</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </>
    )
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" aria-label="People" className="w-72 p-2">
        <List people={people} hidden={hidden} onToggle={onToggle} />
      </PopoverContent>
    </Popover>
  )
}
