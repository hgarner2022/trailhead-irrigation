// The vocabulary of the `event` table (docs/plans/2026-11-18-data-model-step-5.md): one dotted name per thing that happens,
// the webhook names where one exists. Adding a kind here does not make it an outbound webhook name (`EVENTS` in
// `src/api/v1/webhooks/deliver.ts` is a separate decision).

export const EVENT_ABOUT = ["customer", "property", "job", "visit", "payment", "invoice"] as const
export type EventAbout = (typeof EVENT_ABOUT)[number]

export const EVENT_KINDS = [
  "job.requested",
  "job.sold",
  "job.cancelled",
  "job.line-added",
  "job.line-edited",
  "job.line-cancelled",
  "visit.scheduled",
  "visit.moved",
  "visit.day-filled",
  "visit.move-requested",
  "visit.confirmed",
  "visit.done",
  "visit.undone",
  "visit.not-done",
  "visit.cancelled",
  "visit.skipped",
  "visit.edited",
  "pass.cancelled",
  "pass.preference-changed",
  "pass.inspection-added",
  "consent",
  "payment.succeeded",
  "payment.failed",
  "payment.refunded",
  "invoice.sent",
  "invoice.reminded",
  "invoice.paid",
  "invoice.cancelled",
  "card.saved",
  "card.failed",
  "card.removed",
  "customer.edited",
  "property.edited",
  "note",
] as const
export type EventKind = (typeof EVENT_KINDS)[number]

/** The `pass_change` kinds, translated once. Mirrored by the `case` in `drizzle/0020_event.sql` (a test keeps the two equal). */
export const LEGACY_EVENT_KIND = {
  "consent-snapshot": "consent",
  renewed: "job.sold",
  sold: "job.sold",
  "visit-created": "job.sold",
  "day-picked": "visit.moved",
  "done-undone": "visit.undone",
  skipped: "visit.skipped",
  cancelled: "pass.cancelled",
  preference: "pass.preference-changed",
  "inspection-added": "pass.inspection-added",
  "visit-edited": "visit.edited",
  "visit-cancelled": "visit.cancelled",
  "move-requested": "visit.move-requested",
  "not-done": "visit.not-done",
  "day-filled": "visit.day-filled",
} as const satisfies Record<string, EventKind>

/** The event kind for a `pass_change` kind; any kind the map does not know is copied unchanged (as the migration does). */
export function eventKindOfLegacy(kind: string): EventKind {
  return (Object.hasOwn(LEGACY_EVENT_KIND, kind) ? LEGACY_EVENT_KIND[kind as keyof typeof LEGACY_EVENT_KIND] : kind) as EventKind
}

/**
 * What a legacy change is about: the visit when it has one and the new kind is a `visit.` kind, else its job, else the customer.
 * (A `visit-created` row is about its job even though it carries the visit.)
 */
export function aboutOfLegacy(kind: EventKind, has: { visitId?: string | null; jobId?: string | null }): "visit" | "job" | "customer" {
  if (has.visitId && kind.startsWith("visit.")) return "visit"
  if (has.jobId) return "job"
  return "customer"
}
