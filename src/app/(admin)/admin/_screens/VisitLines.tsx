import { lineWords } from "./visit-panel-model"
import type { JobLine } from "@/lib/admin/types"

// What the job sold, one line to a row ("Spring turn-on, 8 zones · $145"), and what the visit includes, from the
// service's description copied onto the line at the sale. Both read the job's lines and nothing else.

/** The job's lines, the one for this visit in bold; a cancelled line is struck through and says so. */
export function JobLines({ lines, visitId }: { lines: JobLine[]; visitId: string }) {
  return (
    <ul className="mt-2 text-sm" data-slot="visit-lines" aria-label="What was sold">
      {lines.map((line) => (
        <li key={line.id} className={`py-0.5 ${line.visitId === visitId ? "font-semibold" : ""} ${line.cancelledAt ? "text-muted-foreground line-through" : ""}`}>
          {lineWords(line)}
        </li>
      ))}
    </ul>
  )
}

/** "What's included": the plain words of what this visit covers. */
export function Included({ text }: { text: string }) {
  return (
    <section aria-labelledby="visit-included" data-slot="visit-included">
      <h3 id="visit-included" className="font-display text-lg leading-tight text-navy">
        What&apos;s included
      </h3>
      <p className="mt-2 text-sm">{text}</p>
    </section>
  )
}
