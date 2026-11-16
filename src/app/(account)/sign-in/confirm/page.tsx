import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { confirmFormFor } from "@/lib/auth/confirm-link"

// Where the sign-in email's link lands. One button submits a plain GET form
// to Auth.js's callback with the token, so a mail scanner that opens the
// link never spends it (src/lib/auth/confirm-link.ts). Outside the
// /account gate on purpose: nobody has a session yet.

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } }
export const dynamic = "force-dynamic"

export default async function ConfirmSignInPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const { to } = await searchParams
  const form = confirmFormFor(to)
  const audience = form?.fields.find(([k]) => k === "callbackUrl")?.[1]?.startsWith("/admin") ? "admin" : "customer"
  const retry = audience === "admin" ? "/admin/sign-in" : "/account/sign-in"
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card data-slot="sign-in-confirm" className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
          <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={114} height={80} className="h-20 w-auto self-start" />
          <h1 className="font-display text-3xl text-navy">{form ? "Finish signing in" : "This link is not valid"}</h1>
          {form ? (
            <>
              <p className="text-muted-foreground">Press the button and you are in. The link works once.</p>
              <form method="get" action={form.action}>
                {form.fields.map(([name, value]) => (
                  <input key={name} type="hidden" name={name} value={value} />
                ))}
                <Button type="submit" size="lg" className="w-full">Sign in</Button>
              </form>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">It may have been changed on the way. Ask for a new one and use the button in that email.</p>
              <Button asChild size="lg" className="w-full"><Link href={retry}>Get a new link</Link></Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
