import "server-only"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"
import * as s from "@/db/schema"
import { customerHasCard } from "@/lib/customer/card"
import { readAppUrl } from "@/lib/env"
import { visitBalance } from "@/lib/money/record"
import { chargeVisit } from "@/lib/pass/server/charge-visit"
import { getStripe } from "@/lib/stripe/client"
import { ApiError } from "../../core/errors"
import { defineHandler } from "../../core/handler"
import { Id } from "../shared"
import { openInvoiceOf } from "../invoices/queries"
import { loadVisit } from "../visits/queries"
import { assertNoCardChargeInFlight } from "./record"
import { paymentOut } from "./queries"
import { PaymentOut } from "./schemas"

/** What the panel says when the card is declined; the customer has already been emailed the card link. */
export const DECLINED = "The card didn't go through. Pick another way."

export const paymentsChargeCard = defineHandler({
  name: "payments.chargeCard",
  method: "POST",
  path: "/payments/charge-card",
  scope: "collect",
  summary:
    "Charge the customer's card on file for what is unpaid on a done visit (a Season Pass visit or a one-off), now, because a person pressed the button. Marking a visit done never charges. It writes one payment row: succeeded (the receipt is emailed) or failed (the customer is emailed the card update link at once, the charge is tried again when the card is fixed and once more three days on, then it stops). Refused when the visit is not done, the customer has no card Stripe holds, the visit is already paid or part paid, a charge is still going through, or an earlier attempt failed and the card has not been fixed.",
  input: z.object({ visitId: Id }),
  output: PaymentOut,
  async run(ctx, input) {
    const { visit } = await loadVisit(ctx, input.visitId)
    if (visit.status !== "completed") throw new ApiError("unprocessable", "Mark the visit done first")
    const [job] = await ctx.db.select().from(s.job).where(and(eq(s.job.id, visit.jobId), eq(s.job.organizationId, ctx.organizationId)))
    if (!job) throw new ApiError("unprocessable", "This visit has no job")
    const [customer] = await ctx.db.select().from(s.customer).where(and(eq(s.customer.id, job.customerId), eq(s.customer.organizationId, ctx.organizationId)))
    if (!customer || !customerHasCard(customer) || !customer.stripeCustomerId) throw new ApiError("unprocessable", "This customer has no card on file. Pick another way.")
    const { price, paid } = await visitBalance(ctx.db, ctx.organizationId, visit)
    if (price <= 0) throw new ApiError("invalid", "Price the visit before charging it")
    if (paid >= price) throw new ApiError("conflict", "This visit is already paid")
    if (paid > 0) throw new ApiError("unprocessable", "Part of this visit is paid. Record the rest another way.")
    if (await openInvoiceOf(ctx.db, ctx.organizationId, visit.jobId)) throw new ApiError("conflict", "An invoice is out for this job. The customer pays it there, or cancel the invoice first.")
    await assertNoCardChargeInFlight(ctx, visit.id)
    const outcome = await chargeVisit(ctx.db, getStripe(), visit.id, { origin: readAppUrl(), now: ctx.now })
    if (outcome === "waiting-for-card") throw new ApiError("conflict", DECLINED)
    if (outcome === "invoice-open") throw new ApiError("conflict", "An invoice is out for this job. The customer pays it there, or cancel the invoice first.")
    if (outcome === "cancelled-pass") throw new ApiError("unprocessable", "This job is canceled")
    if (outcome !== "charged" && outcome !== "failed") throw new ApiError("conflict", "That visit has nothing to charge")
    const [row] = await ctx.db.select().from(s.charge).where(eq(s.charge.visitId, visit.id)).orderBy(desc(s.charge.attempt)).limit(1)
    return paymentOut(ctx, row!)
  },
})
