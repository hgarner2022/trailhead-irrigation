import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { accountPrincipal } from "@/lib/auth/account-principal"

// Whether the visitor holds a customer session, and nothing else: the marketing header reads it to say "Your account" instead of "Sign in" (UX audit row 10). The header sits on
// static pages, so it asks here from the browser rather than reading the session on the server, which would make every marketing page dynamic for guests. The answer carries no
// name, no email, no id: `{ signedIn: true }` or `{ signedIn: false }`, never cached. An admin whose email is also a customer's counts, as `/account` opens for them.

export const dynamic = "force-dynamic"

export async function GET() {
  let signedIn = false
  try {
    const principal = (await auth())?.principal
    if (principal) signedIn = (principal.type === "customer" ? principal : await accountPrincipal(db(), principal)).type === "customer"
  } catch {
    // no session store to ask (or it failed): the visitor is shown Sign in, which always works
    signedIn = false
  }
  return NextResponse.json({ signedIn }, { headers: { "Cache-Control": "private, no-store" } })
}
