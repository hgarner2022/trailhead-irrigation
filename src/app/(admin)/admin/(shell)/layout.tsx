import "server-only"
import { headers } from "next/headers"
import { AdminShell } from "@/components/blocks/AdminShell"
import { signOut } from "@/auth"
import { requireAdmin } from "@/lib/auth/guard"
import { sectionOf } from "./section"

/** The frame around every admin page. `/admin/sign-in` is outside this group, so it has no rail. */
export default async function ShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const principal = await requireAdmin()
  const pathname = (await headers()).get("x-pathname")
  const name = principal.email.split("@")[0] ?? principal.email
  const initials = name.slice(0, 2).toUpperCase()

  async function onSignOut() {
    "use server"
    await signOut({ redirectTo: "/admin/sign-in" })
  }

  return (
    <AdminShell current={sectionOf(pathname)} user={{ initials, name }} onSignOut={onSignOut}>
      {children}
    </AdminShell>
  )
}
