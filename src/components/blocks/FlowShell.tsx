import type { ReactNode } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The shell of a one-question-per-screen flow (docs/plans/2026-11-19-booking-form-design.md, "Navigation and close"). A header with the logo, which links back to the site, and a Close at the top
// right that leaves the form (a link to the site, or a button when the flow wants to ask first). Under it one white card in a 640px column: a real progress bar labelled "Step 3 of 7", an optional
// notice for what is wrong with the step (the error summary), the question in the display face as the page's one h1 (it takes focus when the step changes), the body, and at the card's foot Back
// and Continue as a pair. On a phone the card runs edge to edge and the pair is fixed to the bottom of the screen, 48px tall. Continue is never off for a missing answer (Hannah, Nov 25 2026); it is disabled only while busy. An optional line (`legal`) sits above the pair.
// The last screen has no Back and no Continue. Plain surface, no photo. Pure props; the flow owns the answers.

export interface FlowShellProps {
  /** the question in the display face, the page's one h1 */
  question: string
  step: number
  total: number
  children: ReactNode
  /** what is wrong with the step, drawn at the top of the card under the progress bar */
  notice?: ReactNode
  onBack?: () => void
  onNext?: () => void
  nextLabel?: string
  /** one quiet line directly above the button bar, such as the terms an action agrees to */
  legal?: ReactNode
  busy?: boolean
  /** the last screen: no button pair, no progress bar, the question as a small eyebrow */
  done?: boolean
  /** kept for the Season Pass days story; the column is 640px for every step now */
  wide?: boolean
  /** where the logo and Close go; the site by default */
  homeHref?: string
  /** asks before leaving: Close is a button that calls this instead of a link */
  onClose?: () => void
  className?: string
}

const COLUMN = "mx-auto w-full max-w-[640px]"

export function FlowShell({ question, step, total, children, notice, onBack, onNext, nextLabel = "Continue", legal, busy, done, homeHref = "/", onClose, className }: FlowShellProps) {
  const closeClass = "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-base font-medium text-navy hover:bg-card focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
  const close = (
    <>
      <X aria-hidden className="size-5" />
      <span className="max-sm:sr-only">Close</span>
    </>
  )
  return (
    <div data-slot="flow-shell" data-step={step} className={cn("min-h-svh bg-stone text-foreground", className)}>
      <header className={cn(COLUMN, "flex items-center justify-between px-4 py-3 sm:px-0")}>
        <a href={homeHref} aria-label="Trailhead Lawn & Irrigation, back to the website" className="inline-flex min-h-11 items-center">
          <Image src="/images/logo-badge.png" alt="" width={102} height={72} priority className="h-14 w-auto" />
        </a>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close the booking form" className={closeClass}>
            {close}
          </button>
        ) : (
          <a href={homeHref} aria-label="Close the booking form" className={closeClass}>
            {close}
          </a>
        )}
      </header>
      <div className={cn(COLUMN, "pb-8 sm:pb-12")}>
        <section data-slot="flow-surface" aria-labelledby="flow-heading" className="flex flex-col bg-background p-4 max-sm:min-h-[calc(100svh-6.5rem)] max-sm:border-y max-sm:border-border sm:rounded-lg sm:border sm:border-border sm:p-8 sm:shadow-sm">
          {!done && (
            <div data-slot="flow-progress" className="mb-6">
              <p data-slot="flow-step" className="text-sm font-semibold text-primary-deep tabular-nums">
                {`Step ${step} of ${total}`}
              </p>
              <div role="progressbar" aria-label="Booking progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-valuetext={`Step ${step} of ${total}`} className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${(step / total) * 100}%` }} />
              </div>
            </div>
          )}
          {notice}
          <h1 id="flow-heading" tabIndex={-1} className={cn("outline-none", done ? "text-xs font-semibold uppercase tracking-wide text-primary-dark" : "font-display text-4xl leading-[1.05] text-navy lg:text-5xl")}>
            {question}
          </h1>
          <div className={cn("flex-1", done ? "mt-4" : "mt-8 pb-8")}>{children}</div>
          {!done && (
            <div
              data-slot="flow-actions"
              className="flex flex-wrap items-center gap-3 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:-mb-4 max-sm:border-t max-sm:border-border max-sm:bg-background max-sm:px-4 max-sm:pt-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-between sm:border-t sm:border-border sm:pt-6"
            >
              {legal}
              {step > 1 && (
                <Button type="button" variant="outline" size="lg" onClick={onBack} className="min-w-24">
                  Back
                </Button>
              )}
              <Button type="button" size="lg" disabled={busy} aria-busy={busy || undefined} onClick={onNext} className={cn("max-sm:flex-1 sm:min-w-44", step <= 1 && "sm:ml-auto")}>
                {busy ? "One moment" : nextLabel}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
