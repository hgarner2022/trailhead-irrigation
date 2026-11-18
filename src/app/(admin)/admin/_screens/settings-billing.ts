/**
 * The Billing tab's reducer (see settings-model.ts for the shape): how many days a bill is due after it is sent, whether bills
 * carry Colorado sales tax, and the percent. Sales tax is in the model and off until the office answers. Each edit is logged
 * in words; a value the API would refuse is refused here and the field snaps back.
 */
import type { BillingSettings } from "@/lib/admin/types"
import { record, type Actor, type SettingsState } from "./settings-model"

export type BillingField = keyof BillingSettings
export const MAX_DUE_DAYS = 120
export const MAX_TAX_PERCENT = 20

const NAMES: Record<BillingField, string> = { dueDays: "Bills are due in", collectsSalesTax: "Collect Colorado sales tax", salesTaxPercent: "Sales tax percent" }
const show = (field: BillingField, v: number | boolean) => (field === "collectsSalesTax" ? (v ? "On" : "Off") : field === "dueDays" ? `${v} days` : `${v}%`)

/** The percent as it is typed: digits with at most two decimals; blank and anything else is no number. */
export function parsePercent(raw: string): number | undefined {
  const text = raw.trim().replace(/%$/, "").trim()
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(text)) return undefined
  return Number(text)
}

export function setBilling(state: SettingsState, field: BillingField, raw: string | number | boolean, actor: Actor): SettingsState {
  const was = state.settings.billing
  let value: number | boolean
  if (field === "collectsSalesTax") {
    if (typeof raw !== "boolean") return state
    value = raw
  } else if (field === "dueDays") {
    const n = typeof raw === "string" ? (raw.trim() === "" ? NaN : Number(raw)) : raw
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > MAX_DUE_DAYS) return state
    value = n
  } else {
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? parsePercent(raw) : undefined
    if (n === undefined || n < 0 || n > MAX_TAX_PERCENT) return state
    value = n
  }
  if (was[field] === value) return state
  return record(state, actor, NAMES[field], show(field, was[field]), show(field, value), { ...state.settings, billing: { ...was, [field]: value } })
}
