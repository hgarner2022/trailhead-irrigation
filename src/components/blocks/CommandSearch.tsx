"use client"

import { Briefcase, CalendarDays, FileText, Inbox, Users } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { RecordKey } from "@/lib/admin/record-url"
import type { SearchHit } from "@/lib/admin/search-hit"

// Cmd or Ctrl+K (docs/plans/2026-11-18-admin-holistic-design.md, section 4): one box over every screen that finds a customer, a job or a day's work by
// name, street, phone or pass number and opens the record. The matching is the server's (`onSearch`, asked after a short pause so a fast typist
// asks once); the box only lists what comes back, three groups, a row each with what it is under its name. Choosing one calls `onOpen` and closes.
// Nothing needs the keyboard: the shell also has a Search button. The group "Days" is a visit; the word is kept to the panels.

export interface CommandSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSearch: (query: string) => Promise<SearchHit[]>
  onOpen: (hit: SearchHit) => void
  /** what the box starts with (a story that shows a search's results) */
  defaultQuery?: string
  /** the pause after the last key before asking, in milliseconds */
  delay?: number
}

const GROUPS: { kind: RecordKey | "request" | "quote"; heading: string; icon: typeof Users }[] = [
  { kind: "customer", heading: "Customers", icon: Users },
  // a request still waiting (New and Seen) is found here and nowhere else; once a job is made of it, its customer and job are (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.7)
  { kind: "request", heading: "Requests", icon: Inbox },
  { kind: "job", heading: "Jobs", icon: Briefcase },
  // a quote is found by its number or its customer's name and opens the Quotes list on it (Hannah, Nov 20 2026)
  { kind: "quote", heading: "Quotes", icon: FileText },
  { kind: "visit", heading: "Days", icon: CalendarDays },
]

export function CommandSearch({ open, onOpenChange, onSearch, onOpen, delay = 150, defaultQuery }: CommandSearchProps) {
  const pick = (hit: SearchHit) => {
    onOpenChange(false)
    onOpen(hit)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="command-search" showCloseButton={false} className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Search</DialogTitle>
          <DialogDescription>Find a customer, a job or a day by name, street, phone or pass number.</DialogDescription>
        </DialogHeader>
        <SearchBox onSearch={onSearch} onPick={pick} delay={delay} defaultQuery={defaultQuery} />
      </DialogContent>
    </Dialog>
  )
}

/** The box and its list. It is mounted only while the dialog is open, so every opening starts empty. */
function SearchBox({ onSearch, onPick, delay, defaultQuery }: { onSearch: CommandSearchProps["onSearch"]; onPick: (hit: SearchHit) => void; delay: number; defaultQuery?: string }) {
  const [query, setQuery] = useState(defaultQuery ?? "")
  const [found, setFound] = useState<{ text: string; hits: SearchHit[] }>({ text: "", hits: [] })
  const latest = useRef(0)
  const text = query.trim()
  useEffect(() => {
    const turn = ++latest.current
    if (text.length < 2) return
    const timer = setTimeout(() => {
      onSearch(text)
        .catch((): SearchHit[] => [])
        // a slower answer to an earlier question never replaces the newer one
        .then((hits) => turn === latest.current && setFound({ text, hits }))
    }, delay)
    return () => clearTimeout(timer)
  }, [text, delay, onSearch])
  const ready = text.length >= 2
  const waiting = ready && found.text !== text
  const hits = ready && !waiting ? found.hits : []
  return (
    <Command label="Search" shouldFilter={false} className="rounded-lg">
      <CommandInput value={query} onValueChange={setQuery} placeholder="Search by name, street, phone or pass number" />
      <CommandList className="max-h-[60vh]">
        {hits.length === 0 && (
          // the list is never empty (an empty listbox is not valid): with nothing to choose it holds one line, which cannot be chosen
          <CommandItem disabled value="no-results" role={waiting ? "status" : undefined} className="justify-center py-6 text-center text-muted-foreground data-[disabled=true]:opacity-100">
            {!ready ? "Type a name, a street, a phone number or a pass number." : waiting ? "Searching…" : "Nothing found. Check the spelling or try the street."}
          </CommandItem>
        )}
        {GROUPS.map(({ kind, heading, icon: Icon }) => {
          const rows = hits.filter((h) => h.kind === kind)
          return rows.length === 0 ? null : (
            <CommandGroup key={kind} heading={heading}>
              {rows.map((hit) => (
                <CommandItem key={`${kind}-${hit.id}`} value={`${kind}-${hit.id}`} onSelect={() => onPick(hit)} className="min-h-11">
                  {hit.seeAll ? (
                    <span data-slot="search-see-all" className="min-w-0 truncate text-sm font-medium text-primary-dark">{hit.title}</span>
                  ) : (
                    <>
                      <Icon className="text-muted-foreground" aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{hit.title}</span>
                        {hit.detail && <span className="block truncate text-xs text-muted-foreground">{hit.detail}</span>}
                        {hit.contact && <span className="block truncate text-xs text-muted-foreground">{hit.contact}</span>}
                      </span>
                    </>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )
        })}
      </CommandList>
    </Command>
  )
}
