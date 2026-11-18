import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { fullDay, type MoneyTone } from "@/lib/portal/words"
import { StatusPill, type PillStatus } from "./StatusPill"

// One job in the customer's list, a whole-row link to the job (docs/plans/2026-11-18-customer-portal-design.md, "Jobs"): its name, the day it was
// sold, how many visits, what it came to and the money word (Paid, "$145 unpaid", "Invoice sent, due Dec 1", "Past due since Dec 1"). A canceled job
// reads Canceled in place of the money. Pure props, server-safe.

export interface JobRowProps {
  href: string
  /** "Season Pass 2027" or "Repair" */
  name: string
  /** the Mountain day it was sold */
  soldOn: string
  /** "2 visits" */
  visitsLine?: string
  /** whole dollars */
  total: number
  money: { tone: MoneyTone; label: string }
  canceled?: boolean
}

const PILL: Record<MoneyTone, PillStatus> = { paid: "paid", unpaid: "owed", "invoice-sent": "bill-sent", "past-due": "overdue", none: "not-yet" }

export function JobRow({ href, name, soldOn, visitsLine, total, money, canceled }: JobRowProps) {
  return (
    <li data-slot="job-row">
      <Link href={href} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 hover:bg-stone/60 sm:px-2">
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-foreground">{name}</span>
          <span className="block text-sm text-muted-foreground">{[`Sold ${fullDay(soldOn)}`, visitsLine].filter(Boolean).join(" · ")}</span>
        </span>
        {total > 0 && <span className="text-base font-semibold text-foreground">{`$${total}`}</span>}
        {canceled ? <StatusPill status="cancelled" label="Canceled" /> : money.label ? <StatusPill status={PILL[money.tone]} label={money.label} /> : null}
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  )
}
