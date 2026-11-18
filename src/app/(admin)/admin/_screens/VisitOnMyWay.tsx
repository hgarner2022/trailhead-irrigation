"use client"

import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import type { Visit } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"

// "On my way": the on-the-way text for a visit that is today, from the visit panel's More menu. The customer reads "Ryan is on the way to
// 412 Ash St for your spring turn-on." and the link to their Trailhead account. Once per visit per day; the API says why when it
// cannot go (no mobile, replied STOP, already sent). One `ConfirmDialog`. Client component.

export function OnMyWay({ visit, actions, open, onOpenChange }: { visit: Visit; actions?: VisitActions; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <ConfirmDialog
      slot="visit-on-my-way"
      title="On my way"
      message="Texts the customer that you are coming. You can send one per visit per day."
      confirmLabel="Send text"
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={actions ? () => actions.sendOnTheWay(visit.id) : undefined}
      log={`on my way ${visit.id}`}
    />
  )
}
