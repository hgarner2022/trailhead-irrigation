import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TextRyan } from "@/components/blocks/TextRyan"
import { textRyanHref } from "@/lib/portal/words"

// What /account/* says when a visit (or receipt) cannot be opened (UX audit row 3): the account header comes from the account layout around it, this is the body. The way on is
// the customer's visits, or Ryan. Pure render, server component.

export const ACCOUNT_NOT_FOUND_LINE = "We can't open that visit. Go to your visits, or text Ryan."

export function AccountNotFound() {
  return (
    <main data-slot="account-not-found" className="mx-auto max-w-xl container-padding-x py-10">
      <h1 className="font-display text-3xl text-navy">We can&apos;t open that</h1>
      <p className="mt-3 text-base text-foreground">{ACCOUNT_NOT_FOUND_LINE}</p>
      <div className="mt-6 space-y-4">
        <Button asChild size="lg">
          <Link href="/account/visits">Go to your visits</Link>
        </Button>
        <TextRyan textHref={textRyanHref("Hi Ryan, a link in my Trailhead account did not open.")} why={false} />
      </div>
    </main>
  )
}
