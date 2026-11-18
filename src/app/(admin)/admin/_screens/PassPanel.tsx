"use client"

import { SectionHeading } from "@/components/blocks/SectionHeading"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { PassActions } from "@/components/blocks/PassActions"
import { PassSeason } from "@/components/blocks/PassSeason"
import { visitPaid } from "@/lib/admin/jobs"
import type { Pass } from "@/lib/admin/types"
import type { Outcome } from "./action-types"
import type { PassesActions } from "./passes-actions"
import { PENDING_NOTE, cardWords, consentLine, seasonCharges, seasonFacts, seasonVisits } from "./passes-model"
import { useOpenVisit } from "./VisitPanelHost"

// What the Jobs panel and the Customers panel show for a Season Pass. `PassSeasonView` is the season (the PassSeason block) with
// the visit rows opening the visit panel of the screen it is on; `ChangePassDialog` is the pass's own buttons (add the July
// inspection, change a timing preference, skip a visit; Open in Stripe is in the job footer's More), which only a manager of the Jobs panel gets, and
// `CancelDialog` is Cancel pass. Client for the dialogs and for the open-visit context.

/** The season view of one pass: the card, the visits with their pills, the season line and the charges; "Send card link" beside the card line for a pass with no card. */
export function PassSeasonView({ pass, today, money, idPrefix, cardAction, withAccess = true, withConsent = true, variant }: { pass: Pass; today: string; money?: string; idPrefix?: string; cardAction?: React.ReactNode; withAccess?: boolean; withConsent?: boolean; variant?: "job" | "customer" }) {
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
      variant={variant}
    />
  )
}

/** What Cancel the pass says about the money: the visits not yet charged are not charged. */
function cancelMoney(pass: Pass): string {
  const left = pass.visits.filter((v) => !visitPaid(v)).reduce((sum, v) => sum + v.amount, 0)
  return `${left > 0 ? `$${left.toLocaleString("en-US")} in visits not yet charged will not be charged.` : "Nothing further is charged."} The remaining visits come off the schedule.`
}

export function CancelDialog({ pass, open, onOpenChange, onCancel }: { pass: Pass; open: boolean; onOpenChange: (open: boolean) => void; onCancel?: (passId: string) => Promise<Outcome> }) {
  return (
    <ConfirmDialog
      title="Cancel this pass?"
      message={cancelMoney(pass)}
      destructive
      confirmLabel="Cancel pass"
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onCancel ? () => onCancel(pass.id) : undefined}
      log={`cancel pass ${pass.number}`}
    />
  )
}

/**
 * "Change the pass", the job footer's outline button: one dialog that holds the pass's own actions (add the July inspection, change a timing
 * preference while the visit has no day, skip a visit), each of which asks its own question. Nothing for a pending pass.
 */
export function ChangePassDialog({ pass, actions, run, open, onOpenChange }: { pass: Pass; actions?: Omit<PassesActions, "addNote">; run: (call: () => Promise<Outcome>, done?: string) => void; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (pass.status === "pending") return null
  return (
    <ConfirmDialog slot="change-pass" size="md" title="Change the pass" message="Add the July inspection, change a timing preference, or skip a visit." actions="none" open={open} onOpenChange={onOpenChange}>
      <PassActions
        pass={pass}
        voice="admin"
        onAddInspection={(id) => (actions ? run(() => actions.addInspection(id)) : console.info("add inspection", [id]))}
        onChangePreference={(kind, preference) => (actions ? run(() => actions.changePreference(pass.id, kind, preference)) : console.info("change preference", [pass.number, kind, preference]))}
        onSkip={(id, kind) => (actions ? run(() => actions.skip(id, kind)) : console.info("skip visit", [id, kind]))}
      />
    </ConfirmDialog>
  )
}
