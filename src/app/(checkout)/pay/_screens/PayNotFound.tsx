import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TextRyan } from "@/components/blocks/TextRyan"
import { textRyanHref } from "@/lib/portal/words"

// What /pay/* says when the link is wrong, old or reissued (UX audit row 2): the link is the problem, the way on is the customer's account where every invoice is, or Ryan.
// Same card as the pay page, no marketing chrome. Pure render, server component.

export const PAY_NOT_FOUND_LINE = "This invoice link is old or wrong. Sign in to see your invoices, or text Ryan."

export function PayNotFound() {
  return (
    <main data-slot="pay-not-found" className="flex min-h-dvh justify-center px-4 py-8 sm:py-12">
      <Card className="h-fit w-full max-w-md">
        <CardContent className="p-5 pt-5 sm:p-8 sm:pt-8">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-12 w-auto" priority />
          <h1 className="mt-5 type-title text-navy">We can&apos;t open that invoice</h1>
          <p className="mt-3 text-base text-foreground">{PAY_NOT_FOUND_LINE}</p>
          <div className="mt-6 space-y-4">
            <Button asChild size="lg" className="w-full">
              <Link href="/account">Sign in</Link>
            </Button>
            <TextRyan textHref={textRyanHref("Hi Ryan, my invoice link did not open.")} why={false} />
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
