import type { Metadata } from "next"
import { AccountNotFound } from "./_screens/AccountNotFound"

// A visit, receipt or job the signed-in customer cannot open (`notFound()` from the account pages): inside the account layout, so the header stays.
export const metadata: Metadata = { title: "Not found", robots: { index: false, follow: false } }

export default function AccountNotFoundPage() {
  return <AccountNotFound />
}
