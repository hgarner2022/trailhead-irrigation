// Two facts about a visit's day that Move needs, pure so the API, the shaping and the screens read the same rule
// (docs/plans/2026-11-18-scheduling-engine-design.md section 6; docs/plans/2026-11-18-admin-holistic-design.md sections 5.2 and 7).

/**
 * A time the customer has been promised. Until the slots of step 7 give a booked time its own fact, that is a window the day-before text
 * has told (`windowTold`), or a time on a one-off visit (the office or the customer picked it: a Season Pass visit's `start_time` is only
 * the stack the day was ordered in, which promises nothing until it is told). A booked time always texts the customer when it moves.
 */
export function timeBooked(v: { isPass: boolean; startTime?: string | null; windowTold?: boolean }): boolean {
  return v.windowTold === true || (!v.isPass && Boolean(v.startTime))
}

/** The slice of an event this needs: newest first in every list handed in. */
export interface MoveEvent {
  kind: string
  visitId: string | null
  detail?: Record<string, unknown> | null
}

/**
 * The visits that are **Waiting on customer**: the newest of a visit's `visit.scheduled`, `visit.moved` and `visit.confirmed` events is a
 * `visit.moved` that asked the customer to reply YES (`detail.asked`). A later move (the customer's own pick is one, by `customer`), a
 * later `visit.confirmed` or the office's "Customer confirmed" clears it. Read from facts, never stored (no column). `events` newest first.
 */
export function waitingVisitIds(events: readonly MoveEvent[] | undefined): Set<string> {
  const waiting = new Set<string>()
  const settled = new Set<string>()
  for (const e of events ?? []) {
    if (!e.visitId || settled.has(e.visitId)) continue
    if (e.kind !== "visit.moved" && e.kind !== "visit.scheduled" && e.kind !== "visit.confirmed") continue
    settled.add(e.visitId)
    if (e.kind === "visit.moved" && e.detail?.asked === true) waiting.add(e.visitId)
  }
  return waiting
}
