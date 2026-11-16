import "server-only"
import { redirect } from "next/navigation"

/** Revenue moved into Reports (Build 1); the old address keeps working. */
export default function RevenuePage() {
  redirect("/admin/reports")
}
