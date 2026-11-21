import { PASS_LINES } from "@/lib/booking/pass-words"

// The "Your Season Pass" step, the renewal as a convenience (Hannah, Nov 21 2026): three plain lines, each a fact of the pass or a decision of hers, and nothing to tick. The terms the customer accepts on
// the contact step carry the legal wording of the renewal, which Hannah owes (docs/plans/2026-11-19-booking-form-design.md, "Needs Hannah"). Pure props.

export function BookingPass() {
  return (
    <ul data-slot="booking-pass" className="space-y-3 text-lg text-foreground">
      {PASS_LINES.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  )
}
