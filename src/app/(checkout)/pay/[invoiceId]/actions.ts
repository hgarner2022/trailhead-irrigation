"use server"

import { redirect } from "next/navigation"
import { db } from "@/db"
import { BUSINESS } from "@/emails/format"
import { readAppUrl } from "@/lib/env"
import { getStripe } from "@/lib/stripe/client"
import { startBillPayment, type StartBillPayment } from "@/lib/stripe/invoice-checkout"

/**
 * The pay page's button: checks the signed link again, then sends the customer to Stripe's card form for the invoice (in
 * `src/lib/stripe/invoice-checkout.ts`, tested without Next). An invoice that is paid or canceled, or a form that would not open,
 * answers one sentence for the page to show; success redirects and never returns.
 */
export async function startPayment(invoiceId: string, token: string): Promise<{ message: string } | undefined> {
  let result: StartBillPayment
  try {
    result = await startBillPayment(db(), getStripe(), { invoiceId, token, origin: readAppUrl() })
  } catch {
    result = { ok: false, message: `We couldn't open the card form. Try again, or call Ryan at ${BUSINESS.phone}.` }
  }
  if (result.ok) redirect(result.url)
  return { message: result.message }
}
