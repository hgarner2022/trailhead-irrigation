// The deposit of a quote (docs/plans/2026-11-20-requests-and-quotes-research.md, "Deposits and card on file at approval"): optional, empty by default, typed as dollars or a percent and
// frozen as dollars, never above the total. Re-exported by quote-model.ts. Pure.

export const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

export type DepositMode = "none" | "dollars" | "percent"

export interface DepositInput {
  mode: DepositMode
  /** what was typed: whole dollars or a percent */
  value: string
}

export interface DepositResult {
  /** whole dollars, or null for no deposit */
  amount: number | null
  percent?: number
  /** why it cannot be sent, in words, or empty */
  problem: string
}

/** The dollar amount a typed deposit comes to, frozen as dollars, and what is wrong with it: more than zero, no more than the total, whole dollars. */
export function depositOf(total: number, input: DepositInput): DepositResult {
  if (input.mode === "none") return { amount: null, problem: "" }
  const raw = input.value.trim()
  if (!raw) return { amount: null, problem: input.mode === "dollars" ? "Type the deposit in dollars." : "Type the deposit as a percent of the total." }
  if (!/^\d+(\.\d+)?$/.test(raw)) return { amount: null, problem: "Use numbers only." }
  const n = Number(raw)
  if (input.mode === "dollars") {
    if (!Number.isInteger(n)) return { amount: null, problem: "Use whole dollars." }
    if (n <= 0) return { amount: null, problem: "A deposit is more than $0." }
    if (n > total) return { amount: null, problem: `A deposit cannot be more than the total, ${money(total)}.` }
    return { amount: n, problem: "" }
  }
  if (n <= 0) return { amount: null, problem: "A deposit is more than 0%." }
  if (n > 100) return { amount: null, problem: "A deposit cannot be more than 100% of the total." }
  const amount = Math.round((total * n) / 100)
  if (amount <= 0) return { amount: null, problem: "That percent comes to less than $1." }
  return { amount, percent: n, problem: "" }
}
