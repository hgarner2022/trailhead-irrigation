import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PassCard } from "@/components/blocks/PassCard"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { Pass } from "@/lib/admin/types"
import { CancelPassDialog } from "./CancelPassDialog"
import { cardLine, seasonCaption, visitRows } from "./pass-page-model"

// The customer's pass page: a season card, not a dashboard. The pass card at
// the top, the season line with the three visits and their state, the card
// on file with one update button, and one cancel link that asks before it
// does anything (CancelPassDialog). The visit states use the customer's words,
// Done, Booked and Reserved, in the StatusPill colours; a customer never reads
// "Not scheduled". A cancelled pass shows the grey card and one line. Pure
// composition over `pass` and `today`; the route's page.tsx supplies both.
// Server component; the dialog carries its own client boundary.

export interface PassPageScreenProps {
  pass: Pass
  /** ISO date the season line's marker is read from */
  today: string
  /** called when the customer confirms the cancel dialog */
  onCancel?: () => void
}

const LOGO = "/images/logo-badge.png"

function Title({ children }: { children: string }) {
  return <h2 className="font-display text-2xl font-semibold leading-none text-navy">{children}</h2>
}

export function PassPageScreen({ pass, today, onCancel }: PassPageScreenProps) {
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
            This pass is cancelled. Nothing further is charged, and your blowout week is released. Book any visit online whenever you like.
          </p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <Title>Your season</Title>
              </CardHeader>
              <CardContent className="space-y-6">
                <SeasonLine mode="customer" season={pass.season} visits={pass.visits} today={today} caption={seasonCaption(pass)} />
                <ul className="divide-y divide-border">
                  {visitRows(pass).map((row) => (
                    <li key={row.kind} data-slot="pass-visit-row" className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-foreground">{row.name}</span>
                        <span className="block text-sm text-muted-foreground">{row.when}</span>
                      </span>
                      <StatusPill status={row.status} label={row.label} />
                    </li>
                  ))}
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
                <p className="text-base text-muted-foreground">Reply to any of our emails or call and we&apos;ll move a visit or update the address. You can also end the pass here.</p>
                <CancelPassDialog onConfirm={onCancel} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
