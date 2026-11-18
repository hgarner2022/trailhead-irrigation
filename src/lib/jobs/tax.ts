// Sales tax on a job, as pure rules. Tax is per line and rounded to the dollar per line, so a job's tax always equals its
// visits' tax plus its visit-less lines' tax, and a bill built from the same function always equals what the job owes.
// The rule is `settings.billing` (`billingOf`): nothing is taxed while the organization does not collect it.

/** What `billingOf(settings)` returns, as far as tax is concerned. */
export interface TaxRule {
  collectsSalesTax: boolean
  /** percent, e.g. 8.1; used only while `collectsSalesTax` is on */
  salesTaxPercent: number
}

/** The rule while nothing is collected: every tax is 0 and every total is its subtotal. */
export const NO_TAX: TaxRule = { collectsSalesTax: false, salesTaxPercent: 0 }

/** A line as the tax words read it: the live, taxable ones are taxed. */
export interface TaxLine {
  quantity: number
  /** whole dollars */
  unitPrice: number
  taxable: boolean
  cancelledAt?: Date | string | null
}

/** The rule out of an organization's settings row (an organization that never saved Billing has none: nothing is collected). */
export const taxRuleOf = (billing: Partial<TaxRule> | null | undefined): TaxRule => ({ collectsSalesTax: Boolean(billing?.collectsSalesTax), salesTaxPercent: billing?.salesTaxPercent ?? 0 })

/** The tax on one line: quantity times unit price times the percent, rounded to the dollar; 0 for a cancelled or non-taxable line or while nothing is collected. */
export function lineTax(line: TaxLine, rule: TaxRule): number {
  if (line.cancelledAt || !line.taxable || !rule.collectsSalesTax || rule.salesTaxPercent <= 0) return 0
  return Math.round((line.quantity * line.unitPrice * rule.salesTaxPercent) / 100)
}

/** The tax on a set of lines: the lines' own taxes added up. */
export function jobTax(lines: readonly TaxLine[], rule: TaxRule): number {
  return lines.reduce((sum, line) => sum + lineTax(line, rule), 0)
}

/** A visit's tax: `jobTax` over its own lines (the caller picks them out with `linesOfVisit`). */
export const visitTax = jobTax

/** What the lines come to before tax, cancelled lines left out. */
export function jobSubtotal(lines: readonly Pick<TaxLine, "quantity" | "unitPrice" | "cancelledAt">[]): number {
  return lines.reduce((sum, line) => sum + (line.cancelledAt ? 0 : line.quantity * line.unitPrice), 0)
}
