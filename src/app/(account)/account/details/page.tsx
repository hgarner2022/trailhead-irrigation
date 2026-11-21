import "server-only"
import type { Metadata } from "next"
import { saveContact, saveYard, startCardUpdate } from "../actions"
import { customerCtx, loadAccount } from "../account-data"
import { DetailsScreen } from "../_screens/DetailsScreen"
import { NotACustomer } from "../_screens/NotACustomer"

export const metadata: Metadata = { title: "Details" }
export const dynamic = "force-dynamic"

/** Details: name, mobile, email, each service address and its yard facts, and the card on file. */
export default async function DetailsPage() {
  const ctx = await customerCtx()
  if (!ctx) return <NotACustomer />
  const { customer } = await loadAccount(ctx)
  return <DetailsScreen customer={customer} onSaveContact={saveContact} onSaveYard={saveYard} onUpdateCard={startCardUpdate} />
}
