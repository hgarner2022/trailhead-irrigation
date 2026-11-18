import type { z } from "zod";
import type { PassDetail } from "@/api/v1/passes/schemas";
import { instantOf } from "@/lib/admin/shape";
import type { Pass, PassVisit } from "@/lib/admin/types";

const ORDER = ["turn-on", "inspection", "blowout"];
const WINDOWS: Record<string, string> = {
  "turn-on": "May",
  inspection: "July",
  blowout: "October",
};

type OwnLine = {
  visitId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: number;
  cancelledAt: string | null;
};

/** The visit's own lines from the job's lines the API sends with it: the ones invoiced after this visit and not canceled. */
const ownLines = (v: { id: string; lineItems?: OwnLine[] }) =>
  v.lineItems?.filter((l) => l.visitId === v.id && !l.cancelledAt) ?? [];

/**
 * The `Pass` the customer page takes, from one `passes.get` answer. A cancelled or skipped visit is left out, as in the admin's
 * shaping; a pending pass (checkout not finished) is not a pass the customer holds and is left to the caller to drop.
 */
export function passFromApi(d: z.infer<typeof PassDetail>): Pass {
  const visits: PassVisit[] = d.visits
    .filter(
      (v) =>
        ORDER.includes(v.kind) &&
        v.status !== "cancelled" &&
        v.status !== "skipped",
    )
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
    .map((v) => {
      const own = ownLines(v);
      // Price is what the visit's lines come to; the description is the first line's. The pass page stays untaxed: a pass's lines are always written with
      // taxable false (`insertLines` with `untaxed`), so the lines' total is what the visit costs.
      const description = own[0]?.description;
      return {
        kind: v.kind as PassVisit["kind"],
        window: v.window ?? WINDOWS[v.kind]!,
        amount: own.length
          ? own.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
          : v.amount,
        id: v.id,
        ...(description ? { description } : {}),
        ...(v.scheduledOn
          ? {
              scheduledAt: instantOf(v.scheduledOn, v.startTime),
              scheduledOn: v.scheduledOn,
            }
          : {}),
        ...(v.startTime ? { startTime: v.startTime } : {}),
        ...(v.durationMinutes ? { windowMinutes: v.durationMinutes } : {}),
        ...(v.calendarUrl ? { calendarUrl: v.calendarUrl } : {}),
        // the person assigned; the pass page says who is coming beside the date
        ...(v.personName ? { personName: v.personName } : {}),
        ...(v.completedOn
          ? { completedAt: instantOf(v.completedOn, "12:00") }
          : {}),
        // the visit's payment rows, from which "Paid" is read; the old charged flag is not carried
        payments: [...(v.payments ?? []), ...(v.jobPaymentShares ?? [])].map((p) => ({ id: p.id, jobId: p.jobId, visitId: p.visitId, amount: p.amount, method: p.method, status: p.status, paidOn: p.paidOn, refundsPaymentId: p.refundsPaymentId })),
      };
    });
  return {
    id: d.id,
    number: d.number,
    season: d.season,
    clientId: d.customerId,
    firstName: d.firstName,
    town: d.town,
    zones: d.zones,
    turnOnPreference: d.turnOnPreference,
    blowoutPreference: d.blowoutPreference,
    status:
      d.status === "cancelled"
        ? "cancelled"
        : d.status === "lapsed"
          ? "lapsed"
          : d.status === "pending"
            ? "pending"
            : "active",
    visits,
    stripeUrl: "",
    jobberUrl: "",
    ...(d.cardLast4 ? { cardLast4: d.cardLast4 } : {}),
    ...(d.cardExpires ? { cardExpires: d.cardExpires } : {}),
    ...(d.cardFailedAt ? { cardFailedAt: d.cardFailedAt } : {}),
    ...(d.needsCustomerHome ? { needsCustomerHome: true } : {}),
  };
}
