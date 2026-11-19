"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { FormRow } from "@/components/blocks/FormRow"
import { SettingsList } from "@/components/blocks/SettingsList"
import { MAX_DUE_DAYS, setBilling } from "../settings-billing"
import type { SettingsState } from "../settings-model"
import { CommitInput, TAP_TARGET, type Apply } from "./fields"

// How an invoice is due and taxed: the days after it is sent, and whether it carries Colorado sales tax. Sales tax is off until the
// office says it collects it; the percent is asked for only then. Which lines are taxed is set per service (the Services tab).

export function Billing({ state, apply }: { state: SettingsState; apply: Apply }) {
  const { dueDays, collectsSalesTax, salesTaxPercent } = state.settings.billing
  return (
    <SettingsList
      title="Billing"
      description="What an invoice says when you press Send an invoice on a job that is done."
      changes={state.changes}
      rows={[
        {
          id: "invoices",
          title: "Invoices",
          single: true,
          children: (
            <>
              <FormRow label="Due in" inline htmlFor="billing-due" hint="Days, counted from the day the invoice is sent.">
                <CommitInput id="billing-due" type="number" min={0} max={MAX_DUE_DAYS} label="Days until an invoice is due" className="w-28" value={dueDays} onCommit={(v) => apply((s, a) => setBilling(s, "dueDays", Number(v), a))} />
              </FormRow>
              <FormRow label="Sales tax" inline hint="An invoice adds the tax to its taxable lines. Off, no invoice shows a tax line.">
                <Checkbox className={`mt-2.5 ${TAP_TARGET}`} aria-label="Collect Colorado sales tax" checked={collectsSalesTax} onCheckedChange={(v) => apply((s, a) => setBilling(s, "collectsSalesTax", v === true, a))} />
              </FormRow>
              {collectsSalesTax && (
                <FormRow label="Percent" inline htmlFor="billing-percent" hint="Up to two decimals, like 8.8. The tax is rounded to the dollar on each line.">
                  <div className="flex items-center gap-2">
                    <CommitInput id="billing-percent" label="Sales tax percent" className="w-28" value={String(salesTaxPercent)} onCommit={(v) => apply((s, a) => setBilling(s, "salesTaxPercent", v, a))} />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </FormRow>
              )}
            </>
          ),
        },
      ]}
    />
  )
}
