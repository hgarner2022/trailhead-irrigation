import "server-only"
import type { Metadata } from "next"
import { PassEmptyScreen } from "./_screens/PassEmptyScreen"
import { ctxFromAccount } from "@/lib/admin/api-ctx"
import { requireCustomer } from "@/lib/auth/guard"
import { loadPassPage } from "@/lib/pass/server/pass-page"
import { addInspection, cancelPass, changePreference, pickDay, skipVisit, startCardUpdate } from "./actions"
import { PassPageScreen } from "./_screens/PassPageScreen"

export const metadata: Metadata = { title: "Your Season Pass" }
// Always the signed-in customer's own pass, read fresh.
export const dynamic = "force-dynamic"

/** The customer's pass page: sign-in guarded, read through the API with the customer's own principal. */
export default async function PassPage() {
  const principal = await requireCustomer()
  // An admin who opens this page holds no pass of their own; `passes.list` would show them everyone's.
  const data = principal.type === "customer" ? await loadPassPage(await ctxFromAccount()) : null
  if (!data) return <PassEmptyScreen />
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
