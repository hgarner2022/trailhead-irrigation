"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

// What the real New job sheet does not say yet, put under its customer (Hannah, Nov 19 2026): once a customer is chosen, from a customer's page, a
// job, an invoice, the Customers list or by typing a name, the sheet shows their property (street, zones, access note, gate code), how to reach
// them, and one quiet line with their last job and what they owe, so the office sees what it is adding to. The zones box is prefilled from the
// property and the focus goes to "What are we doing?". The sheet is a page component this prototype does not edit, so the block is a portal into
// the sheet's own column, found by its data-slot. Pure props apart from reading the sheet.

export interface CustomerFacts {
  name: string
  street: string
  zones: number
  access: string
  gate: string
  contactBy: string
  /** "Sprinkler repair, Oct 29. $145 unpaid." */
  lastJob: string
}

export const CUSTOMER_FACTS: CustomerFacts[] = [
  { name: "Andrea Dalton", street: "480 Briggs St, Erie", zones: 8, access: "Side gate by the garage, dog is friendly.", gate: "4417", contactBy: "Text", lastJob: "Sprinkler repair, Nov 12. $145 unpaid." },
  { name: "Marcus Bell", street: "91 Main St, Longmont", zones: 6, access: "Gate is never locked.", gate: "None", contactBy: "Text", lastJob: "Sprinkler repair, Oct 29. $145 unpaid." },
  { name: "Dale Whitaker", street: "212 Main St, Lafayette", zones: 6, access: "Call before coming, he works from home.", gate: "None", contactBy: "Email", lastJob: "Season Pass 2026, Oct 14. Paid." },
]

const setNative = (el: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
}

export function NewJobContext({ focusWhat }: { focusWhat: boolean }) {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [name, setName] = useState<string | null>(null)
  useEffect(() => {
    let focused = false
    const scan = () => {
      const picker = document.querySelector("[data-slot=new-job] [data-slot=customer-picker]")
      if (!picker) {
        setHost(null)
        setName(null)
        return
      }
      let h = picker.parentElement?.querySelector<HTMLElement>(":scope > [data-slot=new-job-context]") ?? null
      if (!h) {
        h = document.createElement("div")
        h.setAttribute("data-slot", "new-job-context")
        picker.insertAdjacentElement("afterend", h)
      }
      setHost((prev) => (prev === h ? prev : h))
      const chosen = picker.querySelector("p span.font-medium")?.textContent?.trim() ?? null
      setName((prev) => (prev === chosen ? prev : chosen))
      const facts = CUSTOMER_FACTS.find((f) => f.name === chosen)
      const zones = document.querySelector<HTMLInputElement>("#nj-zones")
      if (facts && zones && !zones.dataset.prefilled) {
        zones.dataset.prefilled = "1"
        if (zones.value !== String(facts.zones)) setNative(zones, String(facts.zones))
      }
      const what = document.querySelector<HTMLSelectElement>("#nj-what")
      if (focusWhat && facts && what && !focused) {
        focused = true
        what.focus()
      }
    }
    scan()
    const ro = new MutationObserver(scan)
    ro.observe(document.body, { childList: true, subtree: true })
    return () => ro.disconnect()
  }, [focusWhat])
  const facts = CUSTOMER_FACTS.find((f) => f.name === name)
  if (!host || !facts) return null
  return createPortal(
    <section data-slot="new-job-customer" aria-label={`${facts.name}'s property`} className="mt-3 rounded-lg bg-stone p-3 text-sm">
      <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1">
        <dt className="text-navy-light">Property</dt>
        <dd className="font-medium text-foreground">{facts.street}</dd>
        <dt className="text-navy-light">Zones</dt>
        <dd className="font-medium text-foreground">{facts.zones}</dd>
        <dt className="text-navy-light">Access note</dt>
        <dd className="font-medium text-foreground">{facts.access}</dd>
        <dt className="text-navy-light">Gate code</dt>
        <dd className="font-medium text-foreground">{facts.gate}</dd>
        <dt className="text-navy-light">Contact by</dt>
        <dd className="font-medium text-foreground">{facts.contactBy}</dd>
      </dl>
      <p data-slot="new-job-last" className="mt-2 text-navy-light">{`Last job: ${facts.lastJob}`}</p>
    </section>,
    host,
  )
}
