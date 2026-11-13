import "server-only"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { EmptyState } from "@/components/blocks/EmptyState"
import { Button } from "@/components/ui/button"
import { ctxFromSession } from "@/lib/admin/api-ctx"
import { requireCustomer } from "@/lib/auth/guard"
import { loadPassPage } from "@/lib/pass/server/pass-page"
import { Ticket } from "lucide-react"
import { addInspection, cancelPass, changePreference, pickDay, skipVisit, startCardUpdate } from "./actions"
import { PassPageScreen } from "./_screens/PassPageScreen"

export const metadata: Metadata = { title: "Your Season Pass" }
// Always the signed-in customer's own pass, read fresh.
export const dynamic = "force-dynamic"

/** The customer's pass page: sign-in guarded, read through the API with the customer's own principal. */
export default async function PassPage() {
  const principal = await requireCustomer()
  // An admin who opens this page holds no pass of their own; `passes.list` would show them everyone's.
  const data = principal.type === "customer" ? await loadPassPage(await ctxFromSession()) : null
  if (!data) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-cream px-4 py-10">
        <div data-slot="pass-empty" className="w-full max-w-md space-y-4">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={57} height={40} className="h-12 w-auto" />
          <EmptyState icon={Ticket} title="No Season Pass on this email yet" line="Sign in with the email you bought with, or look at what the pass includes." className="py-6" />
          <Button asChild>
            <Link href="/season-pass">See the Season Pass</Link>
          </Button>
        </div>
      </main>
    )
  }
  const { pass, passes, today, pickDays } = data
  return (
    <PassPageScreen
      pass={pass}
      passes={passes}
      today={today}
      pickDays={pickDays}
      onCancel={cancelPass.bind(null, pass.id)}
      onUpdateCard={startCardUpdate.bind(null, pass.id)}
      onChangePreference={changePreference.bind(null, pass.id)}
      onPickDay={pickDay.bind(null, pass.id)}
      onAddInspection={addInspection}
      onSkip={skipVisit}
    />
  )
}
