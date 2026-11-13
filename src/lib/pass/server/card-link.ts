import "server-only"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { ApiError } from "@/api/core/errors"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"

/** Makes a fresh card-update link and queues it as an email to the customer. Each call is its own message, so a second request sends a second link. */
export async function queueCardUpdateLink(db: Database, stripe: Stripe, organizationId: string, passId: string, origin: string): Promise<void> {
  const [row] = await db
    .select({ pass: s.seasonPass, customer: s.customer })
    .from(s.seasonPass)
    .innerJoin(s.customer, eq(s.customer.id, s.seasonPass.customerId))
    .where(eq(s.seasonPass.id, passId))
  if (!row || row.pass.organizationId !== organizationId) throw new ApiError("not_found", "Pass not found")
  if (!row.customer.email) throw new ApiError("unprocessable", "This customer has no email address")
  if (!row.customer.stripeCustomerId) throw new ApiError("unprocessable", "This customer has no card on file to update yet")
  const session = await createCardUpdateSession(stripe, { passId, customerId: row.customer.stripeCustomerId, origin })
  await queueMessage(db, {
    organizationId, customerId: row.customer.id, kind: "card-failed", key: `link-${session.id}`,
    data: { ...baseData(origin, row.customer), passNumber: row.pass.number, amount: null, visitName: null, updateUrl: session.url },
  })
}
