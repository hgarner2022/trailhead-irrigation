import Link from "next/link"
import { EmptyState } from "@/components/blocks/EmptyState"
import { Button } from "@/components/ui/button"
import { TextRyan } from "@/components/blocks/TextRyan"
import { textRyanHref } from "@/lib/portal/words"

// What /account/* says when a visit (or receipt) cannot be opened (UX audit row 3): the account header comes from the account layout around it, this is the body. The way on is
// the customer's visits, or Ryan. Pure render, server component.

export const ACCOUNT_NOT_FOUND_LINE = "We can't open that visit. Go to your visits, or text Ryan."

export function AccountNotFound() {
  return (
    <main data-slot="account-not-found" className="mx-auto max-w-xl container-padding-x py-10">
      <EmptyState
        scene="compass"
        size="page"
        titleAs="h1"
        title="We can't open that"
        line={ACCOUNT_NOT_FOUND_LINE}
        action={
          <div className="space-y-4">
            <Button asChild size="lg">
              <Link href="/account/visits">Go to your visits</Link>
            </Button>
            <TextRyan textHref={textRyanHref("Hi Ryan, a link in my Trailhead account did not open.")} why={false} />
          </div>
        }
      />
    </main>
  )
}
