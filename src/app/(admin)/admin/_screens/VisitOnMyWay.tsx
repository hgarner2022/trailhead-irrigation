"use client"

import { Button } from "@/components/ui/button"
import type { Visit } from "@/lib/admin/types"
import type { VisitActions } from "./visit-actions-types"
import { FORM_STATUS, useRunner } from "./use-runner"

// "On my way": the on-the-way text for a visit that is today, from the visit panel. The customer reads "Ryan is on the way to
// 412 Ash St for your spring turn-on." and the link to their Trailhead account. Once per visit per day; the API says why when it
// cannot go (no mobile, replied STOP, already sent). Client component.

export function OnMyWay({ visit, actions }: { visit: Visit; actions?: VisitActions }) {
  const { pending, error, done, run } = useRunner()
  return (
    <section aria-labelledby="visit-on-my-way" data-slot="visit-on-my-way">
      <h3 id="visit-on-my-way" className="font-display text-lg text-navy">
        On my way
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">Texts the customer that you are coming. You can send one per visit per day.</p>
      <Button type="button" variant="outline" className="mt-2 min-h-11" disabled={pending} onClick={() => (actions ? run(() => actions.sendOnTheWay(visit.id), undefined, "Text sent.") : console.info("on my way", visit.id))}>
        On my way
      </Button>
      <p role="alert" className={`${FORM_STATUS} mt-1 ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error || done}
      </p>
    </section>
  )
}
