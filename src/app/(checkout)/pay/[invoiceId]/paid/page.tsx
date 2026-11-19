import type { Metadata } from "next"
import Image from "next/image"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/blocks/EmptyState"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = { title: "Thank you" }

/**
 * Where Stripe's card form returns after an invoice is paid. It needs no token and shows nothing private: the payment is written
 * by the webhook, so this page only says thank you and that the receipt is coming.
 */
export default function PaidPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card data-slot="pay-thanks" className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-2 p-6 sm:p-8">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-12 w-auto self-start" />
          <EmptyState icon={CheckCircle2} title="Thank you, your payment went through" line="Your receipt is on its way by email, and it is in your Trailhead account." className="py-6" />
          {/* The receipt without waiting for the email (UX audit row 13). Both need the customer's sign-in link: the page itself holds no token. */}
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/account/visits">View the receipt</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link href="/account">Open your Trailhead account</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
