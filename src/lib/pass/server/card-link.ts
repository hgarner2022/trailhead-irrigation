import "server-only"
import { eq } from "drizzle-orm"
import type Stripe from "stripe"
import * as s from "@/db/schema"
import type { Database } from "@/db/types"
import { ApiError } from "@/api/core/errors"
import { createCardUpdateSession } from "@/lib/stripe/card-update"
import { ensureStripeCustomer } from "@/lib/stripe/customer"
import { baseData } from "@/lib/messaging/data"
import { queueMessage } from "@/lib/messaging/queue"
import { loadPassRecord } from "./record"

/** Makes a fresh card link and queues it as an email to the customer: to update the card on file, or to add one to a pass sold with none. Each call is its own message, so a second request sends a second link. */
export async function queueCardUpdateLink(db: Database, stripe: Stripe, organizationId: string, passId: string, origin: string): Promise<void> {
  const pass = await loadPassRecord(db, passId, organizationId)
  if (!pass) throw new ApiError("not_found", "Pass not found")
  const [customer] = await db.select().from(s.customer).where(eq(s.customer.id, pass.customerId))
  if (!customer) throw new ApiError("not_found", "Pass not found")
  if (!customer.email) throw new ApiError("unprocessable", "This customer has no email address")
  const session = await createCardUpdateSession(stripe, { passId: pass.jobId, customerId: await ensureStripeCustomer(db, stripe, customer.id), origin })
  await queueMessage(db, {
    organizationId, customerId: customer.id, kind: "card-failed", key: `link-${session.id}`,
    data: { ...baseData(origin, customer), passNumber: pass.number, amount: null, visitName: null, updateUrl: session.url },
  })
}
