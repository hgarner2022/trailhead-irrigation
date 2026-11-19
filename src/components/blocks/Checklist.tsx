"use client"

import { useId, useState } from "react"
import { Camera, StickyNote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { SectionCard } from "./SectionCard"

// The crew's checklist on a job page (Hannah, Nov 19 2026: "do this... we can fill that in later with notes and the ability to upload
// pictures"): the service's items, each with a checkbox, an optional note and an Add photo on the item, and the progress in the card
// title ("Checklist · 2 of 5"). With no template for the service the card says where to set one up. The build needs a checklist template per
// service (Settings › Services) and one checklist item row per visit with done, note and photo (docs/DESIGN.md). Client component, pure props.

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
  note?: string
}

export interface ChecklistProps {
  items: readonly ChecklistItem[]
  /** called with the new list whenever a box, a note or a photo changes; the prototype keeps its own copy */
  onChange?: (items: ChecklistItem[]) => void
  className?: string
}

function Item({ item, onToggle, onNote }: { item: ChecklistItem; onToggle: () => void; onNote: (note: string) => void }) {
  const id = useId()
  const [noting, setNoting] = useState(Boolean(item.note))
  return (
    <li data-slot="checklist-item" data-done={item.done} className="py-3 first:pt-0 last:pb-0">
      <div className="flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={item.done} onChange={onToggle} aria-labelledby={`${id}-l`} className="size-5 shrink-0 accent-primary" />
        <span id={`${id}-l`} className={cn("min-w-0 flex-1 text-sm font-medium", item.done && "text-muted-foreground line-through")}>
          {item.label}
        </span>
        <Button type="button" variant="ghost" className="min-h-11 px-2 text-muted-foreground" aria-label={`Add a note to ${item.label}`} onClick={() => setNoting((n) => !n)}>
          <StickyNote className="size-4" aria-hidden />
        </Button>
        <Button type="button" variant="ghost" className="min-h-11 px-2 text-muted-foreground" aria-label={`Add a photo to ${item.label}`}>
          <Camera className="size-4" aria-hidden />
        </Button>
      </div>
      {noting && <Textarea value={item.note ?? ""} rows={2} aria-label={`Note for ${item.label}`} placeholder="Add a note" className="mt-2" onChange={(e) => onNote(e.target.value)} />}
    </li>
  )
}

export function Checklist({ items: initial, onChange, className }: ChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([...initial])
  const set = (next: ChecklistItem[]) => {
    setItems(next)
    onChange?.(next)
  }
  const done = items.filter((i) => i.done).length
  return (
    <SectionCard title={items.length ? `Checklist · ${done} of ${items.length}` : "Checklist"} id="checklist-h" className={className}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No checklist for this service yet. Set one up in Settings › Services.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <Item key={item.id} item={item} onToggle={() => set(items.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))} onNote={(note) => set(items.map((i) => (i.id === item.id ? { ...i, note } : i)))} />
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

export const REPAIR_STEPS = ["Walk the zones", "Find the leak", "Fix what we can", "Set the controller", "Walk the customer through it"] as const

/** The repair's checklist with the first `done` steps ticked: the fixture for the stories. */
export const repairChecklist = (done: number): ChecklistItem[] => REPAIR_STEPS.map((label, i) => ({ id: `step-${i}`, label, done: i < done }))
