import "server-only"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { callApi } from "@/api/core/call"
import { ApiError } from "@/api/core/errors"
import { paymentsReceipt } from "@/api/v1/portal/receipt"
import { customerCtx } from "../../account-data"
import { NotACustomer } from "../../_screens/NotACustomer"
import { ReceiptScreen } from "../../_screens/ReceiptScreen"

export const metadata: Metadata = { title: "Receipt" }
export const dynamic = "force-dynamic"

/** The printable receipt for one payment, built from the payment row. Another customer's payment is not found. */
export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const receipt = await callApi(ctx, paymentsReceipt, { id: paymentId }).catch((error) => {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404)) notFound()
    throw error
  })
  return <ReceiptScreen receipt={receipt} />
}
