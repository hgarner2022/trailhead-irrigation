import type { ReactNode } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/nav"
import { cn } from "@/lib/utils"

// The shell of a one-question-per-screen flow (docs/plans/2026-11-18-online-booking-design.md section 3), the Season Pass checkout's own frame lifted into a block: a thin orange
// progress line across the top, the logo with "Call Ryan" as a quiet link, the question in the display face, the trail photo faint behind the cream canvas, and a sticky bar with Back
// and the one filled button. Continue can be off, with a hint beside it saying what is missing. The step count follows the path ("2 of 5"). Pure props; the flow owns the answers.

export interface FlowShellProps {
  /** the question in the display face, the page's one h1 */
  question: string
  step: number
  total: number
  children: ReactNode
  /** a line above the question: the booking summary with its Change links */
  summary?: ReactNode
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  /** why Continue is off: "Tap a start time to continue." */
  hint?: string
  busy?: boolean
  /** a laptop column of 48rem for the steps that need it (the day cards) */
  wide?: boolean
  /** the last screen: no button bar, the question as a small eyebrow */
  done?: boolean
  className?: string
}

const COLUMN = "mx-auto w-full max-w-2xl container-padding-x"

export function FlowShell({ question, step, total, children, summary, onBack, onNext, nextLabel = "Continue", nextDisabled, hint, busy, wide, done, className }: FlowShellProps) {
  return (
    <div data-slot="flow-shell" data-step={step} className={cn("relative isolate min-h-svh bg-cream text-foreground", className)}>
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <Image src="/images/trail-mountain-meadow.jpg" alt="" fill sizes="100vw" quality={40} className="object-cover opacity-[0.07]" />
      </div>
      <div role="progressbar" aria-label="Booking progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-valuetext={`Step ${step} of ${total}`} className="fixed inset-x-0 top-0 z-20 h-1 bg-border/60">
        <div className="h-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <header className="fixed inset-x-0 top-1 z-10 flex items-center justify-between container-padding-x py-3">
        <Image src="/images/logo-badge.png" alt="Trailhead Lawn & Irrigation" width={102} height={72} priority className="h-14 w-auto sm:h-[4.5rem]" />
        <div className="flex items-center gap-4">
          <span aria-hidden className="text-xs text-muted-foreground tabular-nums">{`${step} of ${total}`}</span>
          <a href={PHONE_TEL} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-deep underline underline-offset-2">
            {`Call Ryan ${PHONE_DISPLAY}`}
          </a>
        </div>
      </header>
      <section className="flex min-h-svh flex-col outline-none">
        <div className={cn(COLUMN, "flex flex-1 flex-col justify-center pt-24 pb-8", wide && "lg:max-w-3xl")}>
          {summary && <div className="mb-5">{summary}</div>}
          <h1 className={done ? "text-xs font-semibold uppercase tracking-wide text-primary-dark" : "font-display text-4xl leading-[1.05] text-navy lg:text-5xl"}>{question}</h1>
          <div className={done ? "mt-5" : "mt-8"}>{children}</div>
        </div>
        {!done && (
          <div data-slot="flow-actions" className="sticky bottom-0 z-10 max-sm:border-t max-sm:border-border/60 max-sm:bg-cream/95 max-sm:backdrop-blur-sm">
            <div className={cn(COLUMN, "flex items-center justify-between gap-3 pb-8 max-sm:pt-3 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]", wide && "lg:max-w-3xl")}>
              {step > 1 ? (
                <Button variant="ghost" size="lg" onClick={onBack}>
                  Back
                </Button>
              ) : (
                <span />
              )}
              <div className="flex min-w-0 items-center gap-4">
                {hint && nextDisabled && <p className="hidden text-sm text-muted-foreground sm:block">{hint}</p>}
                <Button size="lg" disabled={nextDisabled || busy} aria-busy={busy || undefined} aria-describedby={hint && nextDisabled ? "flow-hint" : undefined} onClick={onNext}>
                  {busy ? "One moment" : nextLabel}
                </Button>
              </div>
            </div>
            {hint && nextDisabled && (
              <p id="flow-hint" className={cn(COLUMN, "pb-3 text-center text-sm text-muted-foreground sm:sr-only")}>
                {hint}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
