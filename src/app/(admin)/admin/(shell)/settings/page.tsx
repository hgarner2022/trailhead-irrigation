import "server-only"
import type { Metadata } from "next"
import { SettingsScreen } from "@/app/(admin)/admin/_screens/SettingsScreen"
import { getAdminData } from "@/lib/admin/data"
import { requireAdmin } from "@/lib/auth/guard"
import { createApiKey, revokeApiKey, saveSettings } from "../actions"
import { loadKeys } from "../settings-keys"

export const metadata: Metadata = { title: "Settings" }
// Always the live numbers, read fresh for the signed-in admin.
export const dynamic = "force-dynamic"

const actions = { save: saveSettings, createKey: createApiKey, revokeKey: revokeApiKey }

export default async function SettingsPage() {
  const principal = await requireAdmin()
  const [data, keys] = await Promise.all([getAdminData("live"), loadKeys(principal)])
  return <SettingsScreen data={data} today={new Date().toISOString()} who={principal.email} keys={keys} readOnly={principal.role === "tech"} actions={actions} />
}
