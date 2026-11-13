import type { Metadata } from "next"
import Image from "next/image"
import { CheckCircle2 } from "lucide-react"
import { EmptyState } from "@/components/blocks/EmptyState"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = { title: "Card saved" }

/** Where Stripe's hosted card-update page returns. The card is stored by the webhook, so this page only says it is saved. */
export default function CardUpdatedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card data-slot="card-updated" className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-2 p-6 sm:p-8">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-12 w-auto self-start" />
          <EmptyState icon={CheckCircle2} title="Your card is saved" line="We will use it for your next visit, and for any visit that was waiting on a new card. You can close this page." className="py-6" />
        </CardContent>
      </Card>
    </main>
  )
}
