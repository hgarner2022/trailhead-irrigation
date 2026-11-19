import type { Metadata } from "next"
import { PayNotFound } from "./_screens/PayNotFound"

// A wrong, missing or expired pay link (`notFound()` from /pay/[invoiceId]) lands here instead of the marketing 404.
export const metadata: Metadata = { title: "Invoice link", robots: { index: false, follow: false } }

export default function PayNotFoundPage() {
  return <PayNotFound />
}
