import "server-only"
import { callApi } from "@/api/core/call"
import { customersMe } from "@/api/v1/portal/me"
import { auth } from "@/auth"
import { AccountNav } from "@/components/blocks/AccountNav"
import { ctxFromAccount } from "@/lib/admin/api-ctx"
import { accountPrincipal } from "@/lib/auth/account-principal"
import { signOutOfAccount } from "./actions"

// The frame around every signed-in /account page: the header with the four places (Home, Visits, Season Pass for someone who has held one, Details). The sign-in pages and the card-saved page come to someone with no session, so they get no header. The header stays off the paper when a
// receipt is printed.

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const principal = (await auth())?.principal
  if (!principal) return children
  // An admin whose email is also a customer's on file sees the account as that customer, with a way back to the admin; an admin with no customer record sees the page's own message.
  const asCustomer = principal.type === "customer" ? principal : await accountPrincipal((await import("@/db")).db(), principal)
  if (asCustomer.type !== "customer") return children
  const me = await callApi(await ctxFromAccount(), customersMe, {})
  return (
    <div className="min-h-svh bg-cream">
      <AccountNav firstName={me.firstName} hasPass={me.hasHeldPass} isStaff={principal.type === "admin"} onSignOut={signOutOfAccount} className="print:hidden" />
      {children}
    </div>
  )
}
