import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PassCard } from "@/components/blocks/PassCard"
import { SeasonLine } from "@/components/blocks/SeasonLine"
import { StatusPill } from "@/components/blocks/StatusPill"
import type { Pass, TimingPreference } from "@/lib/admin/types"
import { preferenceOf } from "@/lib/admin/format"
import { CancelPassDialog, type ActionResult } from "./CancelPassDialog"
import { EarlierSeasons } from "./EarlierSeasons"
import { PassActions } from "@/components/blocks/PassActions"
import { PreferenceDialog } from "@/components/blocks/PreferenceDialog"
import { PickDayButtons } from "./PickDayButtons"
import { bookedWhen, canChange, cardLine, earlierSeasons, passHeadline, pickDayOptions, seasonCaption, visitRows } from "./pass-page-model"

// The customer's pass page: a season card, not a dashboard. The pass card at
// the top, the season line with the visits and their state, the card
// on file with one update button, a Change link on the turn-on and blowout
// rows until their day is set (PreferenceDialog), and one cancel link
// that asks before it does anything (CancelPassDialog). The visit states use the customer's words,
// Done, Booked and Preferred, in the StatusPill colours; a customer never reads
// "Not scheduled". A cancelled pass shows the grey card and one line. Pure
// composition over `pass` and `today`; the route's page.tsx supplies both.
// A returning customer's earlier seasons sit under the card on file as a
// compact list (EarlierSeasons). Server component; the dialogs carry their
// own client boundaries.

export interface PassPageScreenProps {
  /** the current season's pass */
  pass: Pass
  /** every pass this customer has held; the earlier seasons are listed under the current one */
  passes?: Pass[]
  /** ISO date the season line's marker is read from */
  today: string
  /** called when the customer confirms the cancel dialog */
  onCancel?: () => ActionResult | Promise<ActionResult>
  /** called when the customer saves a new timing preference for the turn-on or the blowout */
  onChangePreference?: (kind: "turn-on" | "blowout", preference: TimingPreference) => void
  onAddInspection?: (passId: string) => void
  onSkip?: (passId: string, kind: Pass["visits"][number]["kind"]) => void
  /** a customer who must be home picked one of the offered days */
  onPickDay?: (kind: "turn-on" | "blowout", dayIso: string) => ActionResult | Promise<ActionResult>
  /** the customer asked to update the card; the wiring sends them to Stripe's hosted page. Rendered as a form action. */
  onUpdateCard?: () => void | Promise<void>
  /** the area days the scheduler offers, when the page has them; the prototype's stand-in days are used when absent */
  pickDays?: Partial<Record<"turn-on" | "blowout", string[]>>
}

const LOGO = "/images/logo-badge.png"

function UpdateCardButton({ onUpdateCard, variant, className }: { onUpdateCard?: () => void | Promise<void>; variant?: "outline"; className?: string }) {
  const button = (
    <Button variant={variant} className={className} type={onUpdateCard ? "submit" : "button"}>
      Update card
    </Button>
  )
  return onUpdateCard ? <form action={onUpdateCard}>{button}</form> : button
}

function Title({ children }: { children: string }) {
  return <h2 className="font-display text-2xl font-semibold leading-none text-navy">{children}</h2>
}

export function PassPageScreen({ pass, passes = [pass], today, onCancel, onChangePreference, onAddInspection, onSkip, onPickDay, onUpdateCard, pickDays }: PassPageScreenProps) {
  const cancelled = pass.status === "cancelled"
  const earlier = earlierSeasons(passes, pass)
  const headline = passHeadline(pass, today)
  return (
    <div data-slot="pass-page" data-status={pass.status} className="min-h-svh bg-cream text-foreground">
      <div className="mx-auto max-w-3xl space-y-8 container-padding-x py-10">
        <header className="flex items-center gap-3">
          <Image src={LOGO} alt="Trailhead Lawn & Irrigation" width={51} height={36} className="h-9 w-auto" />
          <h1 className="font-display text-2xl font-semibold leading-none text-navy">Season Pass</h1>
        </header>

        <section
          data-slot="pass-headline"
          data-action={headline.action ?? undefined}
          aria-labelledby="pass-headline-title"
          className={cn("rounded-lg border p-5", headline.action === "update-card" ? "border-warning/40 bg-warning/10" : "border-border bg-background")}
        >
          <h2 id="pass-headline-title" className="font-display text-3xl leading-tight text-navy">
            {headline.title}
          </h2>
          <p className={cn("mt-2 text-base", headline.action === "update-card" ? "text-foreground" : "text-muted-foreground")}>{headline.line}</p>
          {headline.action === "pick-day" && headline.kind && headline.kind !== "inspection" && (
            <div className="mt-5">
              <PickDayButtons kind={headline.kind} days={pickDays?.[headline.kind] ?? pickDayOptions(pass, headline.kind)} onPick={onPickDay} />
            </div>
          )}
          {headline.action === "change-day" && headline.kind && headline.kind !== "inspection" && (
            <div className="mt-5">
              <PickDayButtons kind={headline.kind} days={pickDays?.[headline.kind] ?? pickDayOptions(pass, headline.kind)} onPick={onPickDay} foldedLabel="Pick a different day" />
            </div>
          )}
          {headline.action === "update-card" && <UpdateCardButton onUpdateCard={onUpdateCard} className="mt-5" />}
          {headline.action === "renew" && (
            <Button className="mt-5">{`Reserve ${pass.season + 1}`}</Button>
          )}
          {headline.action === "book" && (
            <Button asChild variant="outline" className="mt-5">
              <a href="/book">Book a visit</a>
            </Button>
          )}
        </section>

        <PassCard pass={pass} priority className="w-full" />

        {cancelled ? (
          <EarlierSeasons passes={earlier} />
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
                          <span className="block text-sm text-muted-foreground">{bookedWhen(visit) ?? row.when}</span>
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
                <UpdateCardButton onUpdateCard={onUpdateCard} variant="outline" />
              </CardContent>
            </Card>

            <EarlierSeasons passes={earlier} />

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
