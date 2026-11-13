import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PassCard } from "@/components/blocks/PassCard"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { Pass, TimingPreference } from "@/lib/admin/types"
import { preferenceOf } from "@/lib/admin/format"
import { CancelPassDialog } from "./CancelPassDialog"
import { PassActions } from "@/components/blocks/PassActions"
import { PreferenceDialog } from "@/components/blocks/PreferenceDialog"
import { canChange, cardLine, seasonCaption, visitRows } from "./pass-page-model"

// The customer's pass page: a season card, not a dashboard. The pass card at
// the top, the season line with the visits and their state, the card
// on file with one update button, a Change link on the turn-on and blowout
// rows until their day is set (PreferenceDialog), and one cancel link
// that asks before it does anything (CancelPassDialog). The visit states use the customer's words,
// Done, Booked and Preferred, in the StatusPill colours; a customer never reads
// "Not scheduled". A cancelled pass shows the grey card and one line. Pure
// composition over `pass` and `today`; the route's page.tsx supplies both.
// Server component; the dialog carries its own client boundary.

export interface PassPageScreenProps {
  pass: Pass
  /** ISO date the season line's marker is read from */
  today: string
  /** called when the customer confirms the cancel dialog */
  onCancel?: () => void
  /** called when the customer saves a new timing preference for the turn-on or the blowout */
  onChangePreference?: (kind: "turn-on" | "blowout", preference: TimingPreference) => void
  onAddInspection?: (passId: string) => void
  onSkip?: (passId: string, kind: Pass["visits"][number]["kind"]) => void
}

const LOGO = "/images/logo-badge.png"

function Title({ children }: { children: string }) {
  return <h2 className="font-display text-2xl font-semibold leading-none text-navy">{children}</h2>
}

export function PassPageScreen({ pass, today, onCancel, onChangePreference, onAddInspection, onSkip }: PassPageScreenProps) {
  const cancelled = pass.status === "cancelled"
  return (
    <div data-slot="pass-page" data-status={pass.status} className="min-h-svh bg-cream text-foreground">
      <div className="mx-auto max-w-3xl space-y-8 container-padding-x py-10">
        <header className="flex items-center gap-3">
          <Image src={LOGO} alt="Trailhead Lawn & Irrigation" width={51} height={36} className="h-9 w-auto" />
          <h1 className="font-display text-2xl font-semibold leading-none text-navy">Season Pass</h1>
        </header>

        <PassCard pass={pass} priority className="w-full" />

        {cancelled ? (
          <p data-slot="pass-cancelled" className="text-base text-muted-foreground">
            This pass is cancelled. Nothing further is charged, and no more visits are placed. Book any visit online whenever you like.
          </p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <Title>Your season</Title>
              </CardHeader>
              <CardContent className="space-y-6">
                <SeasonLine mode="customer" season={pass.season} visits={pass.visits} preferences={pass} today={today} caption={seasonCaption(pass)} />
                <ul className="divide-y divide-border">
                  {pass.visits.map((visit) => {
                    const row = visitRows(pass).find((r) => r.kind === visit.kind)!
                    const preference = canChange(visit) ? preferenceOf(pass, visit.kind) : null
                    return (
                      <li key={row.kind} data-slot="pass-visit-row" className="flex items-center gap-3 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-foreground">{row.name}</span>
                          <span className="block text-sm text-muted-foreground">{row.when}</span>
                        </span>
                        {preference && canChange(visit) && <PreferenceDialog kind={visit.kind} value={preference} onSave={onChangePreference} />}
                        <StatusPill status={row.status} label={row.label} />
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Title>Card on file</Title>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-base text-foreground">{cardLine(pass)}</p>
                <Button variant="outline">Update card</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Title>Need to change something?</Title>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-base text-muted-foreground">Change when we come with the link on a visit above, until its day is set. Skip one visit, or add the July inspection, here. Reply to any of our emails or call to update the address. You can also end the pass.</p>
                <PassActions pass={pass} include={["inspection", "skip"]} onAddInspection={onAddInspection} onSkip={onSkip} />
                <CancelPassDialog onConfirm={onCancel} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
