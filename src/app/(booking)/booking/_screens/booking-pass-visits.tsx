"use client"

import type { BookedVisitLine } from "@/components/blocks/BookedCard"

// The visits of a Season Pass set up, a plain list directly under the wallet card (Hannah, Nov 23 2026: nothing dark over the card): one row per visit with its name, the exact day and time or the
// timing preference in the account's own words, and for a preference the one sentence that says when it is scheduled; then the street and who is coming. Pure props.

export function PassVisitsList({ lines, where, who = "Ryan" }: { lines: readonly BookedVisitLine[]; where: string; who?: string }) {
  return (
    <section data-slot="booked-visits" aria-label="Your visits" className="mt-6">
      <ul className="divide-y divide-border border-y border-border">
        {lines.map((v) => (
          <li key={v.name} data-slot="booked-visit" className="py-4">
            <p className="type-option text-navy">{v.name}</p>
            <p className="mt-1.5 type-body text-foreground">{v.when}</p>
            {v.note && <p className="mt-1 type-meta text-muted-foreground">{v.note}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-base text-foreground">{lines.some((v) => !v.note) ? `${where}. ${who} is coming.` : `${where}.`}</p>
    </section>
  )
}
