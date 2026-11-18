import "server-only"
import { callApi } from "@/api/core/call"
import { customersMe } from "@/api/v1/portal/me"
import { auth } from "@/auth"
import { AccountNav } from "@/components/blocks/AccountNav"
import { ctxFromSession } from "@/lib/admin/api-ctx"
import { signOutOfAccount } from "./actions"

// The frame around every signed-in /account page: the header with the five places (Home, Visits, Jobs, Season Pass for someone who has held one,
// Details). The sign-in pages and the card-saved page come to someone with no session, so they get no header. The header stays off the paper when a
// receipt is printed.

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const principal = (await auth())?.principal
  if (principal?.type !== "customer") return children
  const me = await callApi(await ctxFromSession(), customersMe, {})
  return (
    <div className="min-h-svh bg-cream">
      <AccountNav firstName={me.firstName} hasPass={me.hasHeldPass} onSignOut={signOutOfAccount} className="print:hidden" />
      {children}
    </div>
  )
}
