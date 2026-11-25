import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { PassCard } from "@/components/blocks/PassCard"
import { PreferenceAsk } from "@/components/blocks/PreferenceAsk"
import type { Pass, TimingPreference } from "@/lib/admin/types"
import { preferenceOf } from "@/lib/admin/format"
import { CancelPassDialog, type ActionResult } from "./CancelPassDialog"
import { EarlierSeasons } from "./EarlierSeasons"
import { PassActions } from "@/components/blocks/PassActions"
import { PassVisitRows } from "./PassVisitRows"
import type { BookedTimes } from "@/lib/portal/booked-time"
import type { TimingKind } from "@/lib/portal/preference-words"
import { canReserveNext, reserveNextHref, cardAction, chargeLine, earlierSeasons, passHeadline } from "./pass-page-model"

// The Season Pass tab: the customer's plan, and only the plan (docs/plans/2026-11-19-customer-side-design.md, "Account structure (Nov 22 2026)"). The visits are the Visits tab's, with their money and
// receipts; this page holds what the plan is. In order: whatever needs the customer now (a card that did not go through, a day to pick, next season to reserve; a banner while we are asking for a
// timing), the pass card at its full size (the brand's one showcase: the artwork and the sheen), "Your season" with the plan's visits as plan lines (state and timing, no money, no receipt), the
// one line about how it is paid, and the plan's own actions (add the July inspection, skip a visit, cancel). Next season and earlier seasons sit under it. A canceled pass shows the grey card, one
// line and the earlier seasons. Pure composition over `pass` and `today`; the route's page.tsx supplies both. Server component; the dialogs carry their own client boundaries.

export interface PassPageScreenProps {
  /** the current season's pass */
  pass: Pass
  /** every pass this customer has held; the earlier seasons are listed under the current one */
  passes?: Pass[]
  /** ISO date the plan lines are read from */
  today: string
  /** called when the customer confirms the cancel dialog */
  onCancel?: () => ActionResult | Promise<ActionResult>
  /** called when the customer saves a timing for the turn-on or the blowout (a preference is kept for every season) */
  onChangePreference?: (kind: TimingKind, preference: TimingPreference) => void | Promise<unknown>
  onAddInspection?: (passId: string) => void
  onSkip?: (passId: string, kind: Pass["visits"][number]["kind"]) => { ok: boolean; message?: string } | void | Promise<{ ok: boolean; message?: string } | void>
  /** the customer picked one of the offered days for a visit that has no day */
  /** the customer asked to update the card; the wiring sends them to Stripe's hosted page. Rendered as a form action. */
  onUpdateCard?: () => void | Promise<void>
  /** the booked start of each visit by visit id ("10:30"), so the next visit reads its exact time */
  times?: BookedTimes
  /** the visit kind we are asking a timing for (the "Preference request" went out); absent when nothing is being asked */
  ask?: TimingKind
}

function UpdateCardButton({ onUpdateCard, variant, className, label = "Update card" }: { onUpdateCard?: () => void | Promise<void>; variant?: "outline"; className?: string; label?: string }) {
  const button = (
    <Button variant={variant} className={className} type={onUpdateCard ? "submit" : "button"}>
      {label}
    </Button>
  )
  return onUpdateCard ? <form action={onUpdateCard}>{button}</form> : button
}

function Title({ children }: { children: string }) {
  return <h2 className="font-display text-2xl font-semibold leading-none text-navy">{children}</h2>
}

export function PassPageScreen({ pass, passes = [pass], today, onCancel, onChangePreference, onAddInspection, onSkip, onUpdateCard, times, ask }: PassPageScreenProps) {
  const cancelled = pass.status === "cancelled"
  const earlier = earlierSeasons(passes, pass)
  const headline = passHeadline(pass, today)
  // Only a state that needs the customer is a headline; a pass that is simply on its way is told by the card and its plan lines.
  const needs = headline.action === "update-card" || headline.action === "reserve-next" || headline.action === "book"
  return (
    <main data-slot="pass-page" data-status={pass.status} className="mx-auto max-w-3xl space-y-6 container-padding-x py-8">
      <h1 className="sr-only">Season Pass</h1>

      {needs && (
        <section
          data-slot="pass-headline"
          data-action={headline.action ?? undefined}
          aria-labelledby="pass-headline-title"
          className={cn("rounded-lg border p-4 sm:p-6", headline.action === "update-card" ? "border-warning/40 bg-warning/10" : "border-border bg-card")}
        >
          <h2 id="pass-headline-title" className="font-display text-3xl leading-tight text-navy">
            {headline.title}
          </h2>
          <p className="mt-2 text-base text-foreground">{headline.line}</p>
          {headline.action === "update-card" && <UpdateCardButton onUpdateCard={onUpdateCard} className="mt-4" />}
          {headline.action === "reserve-next" && (
            <Button asChild className="mt-4">
              <a href={reserveNextHref(pass)}>Reserve next season</a>
            </Button>
          )}
          {headline.action === "book" && (
            <Button asChild variant="outline" className="mt-4">
              <a href="/book">Book a visit</a>
            </Button>
          )}
        </section>
      )}

      {ask && !cancelled && <PreferenceAsk kind={ask} value={preferenceOf(pass, ask) ?? "recommended"} onSave={onChangePreference} />}

      <PassCard pass={pass} priority className="w-full" />

      {cancelled ? (
        <EarlierSeasons passes={earlier} />
      ) : (
        <>
          <Card data-slot="your-season">
            <CardHeader>
              <Title>Your season</Title>
            </CardHeader>
            <CardContent className="space-y-4">
              <PassVisitRows pass={pass} onChangePreference={onChangePreference} times={times} note={!ask} />
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-4">
                <p data-slot="charge-line" className="text-base text-muted-foreground">
                  {chargeLine(pass)}
                </p>
                {!pass.cardLast4 && <UpdateCardButton onUpdateCard={onUpdateCard} variant="outline" label={cardAction(pass)} />}
              </div>
              <div data-slot="plan-actions" className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <PassActions pass={pass} include={["inspection", "skip"]} onAddInspection={onAddInspection} onSkip={onSkip} />
                <CancelPassDialog onConfirm={onCancel} />
              </div>
            </CardContent>
          </Card>

          {canReserveNext(pass, passes, today) && headline.action !== "reserve-next" && (
            <Card data-slot="reserve-next">
              <CardHeader>
                <Title>Next season</Title>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-base text-foreground">{`Reserve ${pass.season + 1} now. We fill in your address, zones and card.`}</p>
                <Button asChild variant="outline">
                  <a href={reserveNextHref(pass)}>Reserve next season</a>
                </Button>
              </CardContent>
            </Card>
          )}

          <EarlierSeasons passes={earlier} />
        </>
      )}
    </main>
  )
}
