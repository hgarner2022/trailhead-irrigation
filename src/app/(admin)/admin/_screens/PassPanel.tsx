"use client"

import { useState, useTransition } from "react"
import { PanelHeading } from "@/components/blocks/PanelParts"
import { PassActions } from "@/components/blocks/PassActions"
import { PassSeason } from "@/components/blocks/PassSeason"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { visitPaid } from "@/lib/admin/jobs"
import type { Pass } from "@/lib/admin/types"
import type { Outcome } from "./action-types"
import type { PassesActions } from "./passes-actions"
import { PENDING_NOTE, cardWords, consentLine, seasonCharges, seasonFacts, seasonVisits } from "./passes-model"
import { useOpenVisit } from "./VisitPanelHost"

// What the Jobs panel and the Customers panel show for a Season Pass. `PassSeasonView` is the season (the PassSeason block) with
// the visit rows opening the visit panel of the screen it is on; `PassChange` is the pass's own buttons (add the July
// inspection, change a timing preference, skip a visit, open it in Stripe), which only a manager of the Jobs panel gets, and
// `CancelDialog` is Cancel pass. Client for the dialogs and for the open-visit context.

/** The season view of one pass: the card, the visits with their pills, the season line and the charges; "Send card link" beside the card line for a pass with no card. */
export function PassSeasonView({ pass, today, money, idPrefix, cardAction, withAccess = true, withConsent = true }: { pass: Pass; today: string; money?: string; idPrefix?: string; cardAction?: React.ReactNode; withAccess?: boolean; withConsent?: boolean }) {
  const open = useOpenVisit()
  return (
    <PassSeason
      pass={pass}
      today={today}
      facts={seasonFacts(pass, money, withAccess)}
      consent={withConsent ? consentLine(pass.consent) : undefined}
      card={cardWords(pass)}
      cardAction={cardAction}
      pendingNote={pass.status === "pending" ? PENDING_NOTE : undefined}
      visits={seasonVisits(pass, today)}
      charges={seasonCharges(pass)}
      onOpenVisit={open ?? undefined}
      idPrefix={idPrefix}
    />
  )
}

/** What Cancel the pass says about the money: the visits not yet charged are not charged. */
function cancelMoney(pass: Pass): string {
  const left = pass.visits.filter((v) => !visitPaid(v)).reduce((sum, v) => sum + v.amount, 0)
  return `${left > 0 ? `$${left.toLocaleString("en-US")} in visits not yet charged will not be charged.` : "Nothing further is charged."} The remaining visits come off the schedule.`
}

export function CancelDialog({ pass, open, onOpenChange, onCancel }: { pass: Pass; open: boolean; onOpenChange: (open: boolean) => void; onCancel?: (passId: string) => Promise<Outcome> }) {
  const [pending, start] = useTransition()
  const [problem, setProblem] = useState("")
  const cancel = () => {
    if (!onCancel) {
      console.info("cancel pass", [pass.number])
      return onOpenChange(false)
    }
    start(async () => {
      const out = await onCancel(pass.id)
      setProblem(out.ok ? "" : out.message)
      if (out.ok) onOpenChange(false)
    })
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-semibold text-navy">Cancel this pass?</DialogTitle>
          <DialogDescription>{cancelMoney(pass)}</DialogDescription>
        </DialogHeader>
        <p role="alert" className="text-sm text-destructive empty:hidden">
          {problem}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep pass
          </Button>
          <Button onClick={cancel} disabled={pending}>
            Cancel pass
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** "Change the pass": add the July inspection, change a timing preference while the visit has no day, skip a visit; and the link to the pass in Stripe. */
export function PassChange({ pass, actions, run }: { pass: Pass; actions?: PassesActions; run: (call: () => Promise<Outcome>, done?: string) => void }) {
  if (pass.status === "pending") return null
  return (
    <>
      <section aria-labelledby="pass-change">
        <PanelHeading id="pass-change">Change the pass</PanelHeading>
        <PassActions
          pass={pass}
          voice="admin"
          className="mt-3"
          onAddInspection={(id) => (actions ? run(() => actions.addInspection(id)) : console.info("add inspection", [id]))}
          onChangePreference={(kind, preference) => (actions ? run(() => actions.changePreference(pass.id, kind, preference)) : console.info("change preference", [pass.number, kind, preference]))}
          onSkip={(id, kind) => (actions ? run(() => actions.skip(id, kind)) : console.info("skip visit", [id, kind]))}
        />
      </section>
      {pass.stripeUrl && (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={pass.stripeUrl} target="_blank" rel="noreferrer">
              Open in Stripe
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        </div>
      )}
    </>
  )
}
