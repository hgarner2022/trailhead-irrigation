import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { callApi } from "@/api/core/call"
import { ApiError } from "@/api/core/errors"
import { invoicesPayView } from "@/api/v1/invoices/handlers"
import { ctxForInvoice } from "@/lib/admin/api-ctx"
import { verifyToken } from "@/lib/messaging/tokens"
import { clientIpFrom } from "../../season-pass/checkout/client-ip"
import { startPayment } from "./actions"
import { PayScreen } from "./_screens/PayScreen"

// The pay page: the invoice behind a signed link, public and never indexed. Dynamic, since what it shows (open, overdue, paid)
// changes under the same address. The link's token is the only credential: it opens this one invoice, the page reads it through
// `invoices.payView` as the visitor of that link (the only call that visitor may make), and a wrong or missing token is a 404.
export const dynamic = "force-dynamic"

export const metadata: Metadata = { title: "Your invoice" }

export default async function PayPage({ params, searchParams }: { params: Promise<{ invoiceId: string }>; searchParams: Promise<{ token?: string | string[] }> }) {
  const { invoiceId } = await params
  const { token: given } = await searchParams
  const token = typeof given === "string" ? given : null
  if (!token || !verifyToken("invoice-pay", invoiceId, token)) notFound()
  const ctx = await ctxForInvoice(invoiceId, { clientIp: clientIpFrom(await headers()) })
  if (!ctx) notFound()
  const bill = await callApi(ctx, invoicesPayView, { id: invoiceId }).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound()
    throw error
  })
  return <PayScreen bill={bill} payAction={startPayment.bind(null, invoiceId, token)} />
}
