"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { MIN_QUERY, type PlaceProvider, type PlaceSuggestion } from "@/lib/places"

// One box that finds the address as the customer types: a combobox over the
// provider's suggestions, arrow keys and Enter to pick, Escape to close, a
// check mark once an address is picked. Typing again clears the pick. The
// provider is injected (the fixture in stories, Google Places once wired), so
// the block never holds a key. The line under the box is the parent's: the
// checkout puts the out-of-area message there.

export interface AddressSearchProps {
  /** what is in the box */
  value: string
  /** the address picked from the list, or null while the customer is still typing */
  picked: PlaceSuggestion | null
  provider: PlaceProvider
  onChange: (text: string) => void
  onPick: (place: PlaceSuggestion) => void
  /** the line under the box, in the destructive colour */
  problem?: string | null
  /** the input's `name`, so autofill and form tooling can see it */
  name?: string
  label?: string
  placeholder?: string
  /** marks the input for the shell that focuses `[data-autofocus]` when a step opens */
  autoFocus?: boolean
  className?: string
}

const DEBOUNCE_MS = 150
const LOOKUP_FAILED = "We couldn't look that address up just now. Try again in a moment."

export function AddressSearch({ value, picked, provider, onChange, onPick, problem, name, label = "Street address", placeholder = "Start typing your address", autoFocus, className }: AddressSearchProps) {
  const id = useId()
  const listId = `${id}-list`
  const noteId = `${id}-note`
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState(false)
  const abort = useRef<AbortController | null>(null)

  // The list can show only while the customer is typing a query long enough to ask about;
  // an old answer is hidden by `visible` rather than cleared, so the effect never sets state on its own.
  const visible = !picked && value.trim().length >= MIN_QUERY

  useEffect(() => {
    abort.current?.abort()
    if (!visible) return
    const controller = new AbortController()
    abort.current = controller
    const timer = setTimeout(() => {
      provider(value, controller.signal)
        .then((found) => {
          if (controller.signal.aborted) return
          setSuggestions(found)
          setActive(0)
          setOpen(true)
          setFailed(false)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return
          setSuggestions([])
          setOpen(false)
          setFailed(true)
        })
    }, DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [value, visible, provider])

  const pick = (place: PlaceSuggestion) => {
    setOpen(false)
    setSuggestions([])
    onPick(place)
  }

  // The list owns the arrow keys and Enter only while it is open; closed, they reach the page.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      event.stopPropagation()
      setActive((i) => (event.key === "ArrowDown" ? (i + 1) % suggestions.length : (i - 1 + suggestions.length) % suggestions.length))
    } else if (event.key === "Enter") {
      event.preventDefault()
      event.stopPropagation()
      pick(suggestions[active])
    } else if (event.key === "Escape") {
      event.preventDefault()
      setOpen(false)
    }
  }

  const note = problem ?? (failed ? LOOKUP_FAILED : null)
  const expanded = visible && open && suggestions.length > 0

  return (
    <div data-slot="address-search" className={cn("relative", className)}>
      <div className="relative">
        <Input
          role="combobox"
          name={name}
          aria-label={label}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
          aria-invalid={!!problem || undefined}
          aria-describedby={note ? noteId : undefined}
          autoComplete="off"
          spellCheck={false}
          data-autofocus={autoFocus || undefined}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          className={cn("h-14 rounded-lg bg-background px-4 text-lg shadow-sm", picked && "pr-12", problem && "border-destructive")}
        />
        {picked && !problem && <Check aria-hidden className="pointer-events-none absolute top-1/2 right-4 size-6 -translate-y-1/2 text-positive" />}
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Matching addresses"
        hidden={!expanded}
        className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-lg border border-border bg-background shadow-lg"
      >
        {suggestions.map((place, i) => (
          <li
            key={place.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActive(i)}
            onClick={() => pick(place)}
            className={cn("cursor-pointer px-4 py-3 text-base", i === active ? "bg-cream text-navy" : "text-foreground")}
          >
            <span className="font-medium">{place.line1}</span>
            <span className="text-muted-foreground">{`, ${place.town}, ${place.state} ${place.zip}`}</span>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="sr-only">
        {expanded ? `${suggestions.length} matching ${suggestions.length === 1 ? "address" : "addresses"}, use the arrow keys` : ""}
      </p>
      {note && (
        <p id={noteId} className="mt-3 text-sm text-destructive">
          {note}
        </p>
      )}
    </div>
  )
}
