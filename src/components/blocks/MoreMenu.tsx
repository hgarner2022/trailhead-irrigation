"use client"

import { useState } from "react"
import Link from "next/link"
import { Ellipsis } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { AdminSection } from "./AdminShell"
import { moreItems } from "./admin-nav"

// The phone's More (docs/plans/2026-11-19-navigation-design.md, Hannah's answer 3; a full sheet since Nov 25 2026): a bordered, labelled button
// in the bottom bar's fifth place so it reads as a button. It opens a sheet from the bottom, the full width of the phone, that lists the rest of
// the rail in the rail's order (Requests, Quotes, Invoices, Reports, Settings), each a 48px row with its icon and its count. Sign out is not
// here, it is in the account menu. The button is lit while one of the sheet's screens is the screen.

export interface MoreMenuProps {
  current: AdminSection
  className?: string
  requests?: { count: number }
  quotes?: { count: number }
  invoices?: { count: number }
}

const COUNT_WORD: Partial<Record<AdminSection, string>> = { requests: "new", quotes: "waiting", invoices: "past due" }

export function MoreMenu({ current, className, requests, quotes, invoices }: MoreMenuProps) {
  const [open, setOpen] = useState(false)
  const items = moreItems({ requests: Boolean(requests), quotes: Boolean(quotes), invoices: Boolean(invoices) })
  const counts: Partial<Record<AdminSection, number>> = { requests: requests?.count, quotes: quotes?.count, invoices: invoices?.count }
  const active = items.some((i) => i.id === current)
  return (
    <div data-slot="more-menu" className={cn("flex justify-center px-1 py-1.5", className)}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            data-slot="admin-more"
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-lg border px-2 text-xs font-medium leading-tight outline-hidden focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active ? "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground" : "border-sidebar-foreground/50 text-sidebar-foreground",
            )}
          >
            <span className="relative">
              <Ellipsis className="size-5" aria-hidden />
              {requests && requests.count > 0 && (
                <span data-slot="more-count" className="absolute -right-3 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-cream px-1 text-[11px] font-semibold leading-4 text-navy tabular-nums">
                  <span className="sr-only">{requests.count} new requests</span>
                  <span aria-hidden>{requests.count}</span>
                </span>
              )}
            </span>
            More
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" data-slot="more-sheet" className="gap-0 rounded-t-lg pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="px-4 pb-2 pt-4">
            <SheetTitle className="font-display text-xl text-navy">More</SheetTitle>
            <SheetDescription className="sr-only">The rest of the admin&apos;s screens.</SheetDescription>
          </SheetHeader>
          <nav aria-label="More">
            <ul className="flex flex-col px-2">
              {items.map(({ id, label, href, icon: Icon }) => {
                const count = counts[id] ?? 0
                const here = id === current
                return (
                  <li key={id}>
                    <Link
                      href={href}
                      aria-current={here ? "page" : undefined}
                      onClick={() => setOpen(false)}
                      className={cn("flex min-h-12 items-center gap-3 rounded-lg px-3 text-base text-foreground outline-hidden focus-visible:ring-2 focus-visible:ring-ring", here && "bg-stone font-semibold text-navy")}
                    >
                      <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {count > 0 && (
                        <span data-slot="nav-count" className="rounded-full bg-navy px-2 text-xs font-semibold leading-5 text-white tabular-nums">
                          <span className="sr-only">{`${count} ${COUNT_WORD[id] ?? ""}`}</span>
                          <span aria-hidden>{count}</span>
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  )
}
