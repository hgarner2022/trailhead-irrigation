"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import { MAX_DUE_DAYS, setBilling } from "../settings-billing"
import type { SettingsState } from "../settings-model"
import { CommitInput, type Apply } from "./fields"

// How an invoice is due and taxed: the days after it is sent, and whether it carries Colorado sales tax. Sales tax is off until the
// office says it collects it; the percent is asked for only then. Which lines are taxed is set per service (the Services tab).

export function Billing({ state, apply }: { state: SettingsState; apply: Apply }) {
  const { dueDays, collectsSalesTax, salesTaxPercent } = state.settings.billing
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <SectionHeading level={2}>Invoices</SectionHeading>
        <p className="text-sm text-muted-foreground">What an invoice says when you press Send an invoice on a job that is done.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
            <span>Invoices are due in</span>
            <CommitInput type="number" min={0} max={MAX_DUE_DAYS} label="Days until an invoice is due" className="w-24" describedBy="billing-due-hint" value={dueDays} onCommit={(v) => apply((s, a) => setBilling(s, "dueDays", Number(v), a))} />
            <span>days</span>
          </div>
          <p id="billing-due-hint" className="text-sm text-muted-foreground">
            Counted from the day the invoice is sent.
          </p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Checkbox id="billing-tax" checked={collectsSalesTax} aria-describedby="billing-tax-hint" onCheckedChange={(v) => apply((s, a) => setBilling(s, "collectsSalesTax", v === true, a))} />
            <Label htmlFor="billing-tax" className="font-normal">
              Collect Colorado sales tax
            </Label>
          </div>
          <p id="billing-tax-hint" className="text-sm text-muted-foreground">
            An invoice adds the tax to its taxable lines. Off, no invoice shows a tax line.
          </p>
        </div>
        {collectsSalesTax && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Sales tax percent</p>
            <div className="flex items-center gap-2">
              <CommitInput label="Sales tax percent" className="w-24" describedBy="billing-percent-hint" value={String(salesTaxPercent)} onCommit={(v) => apply((s, a) => setBilling(s, "salesTaxPercent", v, a))} />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p id="billing-percent-hint" className="text-sm text-muted-foreground">
              Up to two decimals, like 8.8. The tax is rounded to the dollar on each invoice.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
