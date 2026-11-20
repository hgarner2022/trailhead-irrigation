"use client"

import { useState, type ReactNode } from "react"
import CardUpdatedPage from "@/app/(account)/account/pass/card-updated/page"
import SeasonPassPage from "@/app/(site)/season-pass/page"
import { SignInCard, type SignInState } from "@/components/blocks/SignInCard"

// The screens of the live app that the customer walkthrough used to stand in for with a labelled placeholder (docs/plans/2026-11-20-handoff.md, gap 3):
// Sign in, Card updated and the Season Pass marketing page. Each one is the real screen, rendered over no server inside the phone: the sign-in card is the
// page's own `SignInCard` with the form's action kept in the prototype (any address goes to the sent note, nothing is sent), the card-saved page is the
// route's page itself, and the marketing page is `(site)/season-pass/page.tsx`, which is the whole page except what the site layout adds around it (the
// header, the footer, the sticky Call and Book Online bar), so a strip says so. A thin strip over each names the screen and carries the way back.

export type LiveWhich = "sign-in" | "card-updated" | "season-pass-page"

const STATES: { key: SignInState | "sent"; label: string }[] = [
  { key: "form", label: "Sign in" },
  { key: "sent", label: "Link sent" },
  { key: "denied", label: "Email not on file" },
  { key: "failed", label: "Not sent" },
]

function Strip({ label, note, onBack, children }: { label: string; note?: string; onBack: () => void; children?: ReactNode }) {
  return (
    <div data-slot="live-screen-strip" className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-1 bg-navy px-4 py-2 text-sm text-white">
      <button type="button" onClick={onBack} className="min-h-11 rounded-sm font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        ‹ Your account
      </button>
      <span className="min-w-0 flex-1 text-white/80">{label}{note ? `. ${note}` : ""}</span>
      {children}
    </div>
  )
}

/** Sign in as the live page draws it, over its four states. The button takes any address to the sent note, as the real action does. */
function SignIn({ onBack, onNotice }: { onBack: () => void; onNotice: (m: string) => void }) {
  const [state, setState] = useState<SignInState>("form")
  const [email, setEmail] = useState("")
  return (
    <div className="bg-cream">
      <Strip label="Sign in, the live screen" onBack={onBack}>
        <div role="group" aria-label="State of the screen" className="flex w-full flex-wrap gap-1">
          {STATES.map((s) => (
            <button key={s.key} type="button" aria-pressed={state === s.key} onClick={() => setState(s.key as SignInState)} className="min-h-11 rounded-full border border-white/40 px-3 text-xs font-medium aria-pressed:bg-white aria-pressed:text-navy">
              {s.label}
            </button>
          ))}
        </div>
      </Strip>
      <SignInCard
        key={state}
        audience="customer"
        className="min-h-0 py-8"
        state={state}
        email={email}
        action={(fd) => {
          setEmail(String(fd.get("email") ?? ""))
          setState("sent")
        }}
        retryHref="/account/sign-in"
        resendAction={() => onNotice("Nothing is sent in the prototype.")}
      />
    </div>
  )
}

export function LiveScreen({ which, onBack, onNotice }: { which: LiveWhich; onBack: () => void; onNotice: (m: string) => void }) {
  if (which === "sign-in") return <SignIn onBack={onBack} onNotice={onNotice} />
  if (which === "card-updated")
    return (
      <div className="bg-cream">
        <Strip label="Card saved, the live screen Stripe returns to" onBack={onBack} />
        <CardUpdatedPage />
      </div>
    )
  return (
    <div className="bg-white">
      <Strip label="The Season Pass page of the website" note="The site's header and footer are not shown" onBack={onBack} />
      <SeasonPassPage />
    </div>
  )
}
