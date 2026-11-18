import Link from "next/link"
import { UserRound } from "lucide-react"
import { EmptyState } from "@/components/blocks/EmptyState"
import { Button } from "@/components/ui/button"

/** What an admin who opens a customer page sees: the pages read one customer's own account, so there is nothing to show without one. */
export function NotACustomer() {
  return (
    <main className="mx-auto max-w-xl container-padding-x py-10">
      <EmptyState
        icon={UserRound}
        title="This page is for customers"
        line="It shows one customer's own account. Sign in with a customer's email to see it, or open the admin."
        action={
          <Button asChild variant="outline">
            <Link href="/admin">Open the admin</Link>
          </Button>
        }
      />
    </main>
  )
}
