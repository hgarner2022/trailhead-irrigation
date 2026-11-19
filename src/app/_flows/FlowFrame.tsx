"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// The frame around a clickable flow in Storybook: a "Flow" strip listing the steps with the present one lit, Start over, the screen itself, and at its right (under it on a phone) the
// texts and emails the customer would get so far, drawn as phone bubbles from the real renderers. Prototype furniture only: nothing here ships and nothing is sent.

export interface FlowStep {
  key: string
  label: string
}
export interface FlowText {
  id: string
  /** "text" is a phone bubble, "email" a card with a subject */
  channel: "text" | "email"
  subject?: string
  body: string
}

const URL_RE = /(https?:\/\/[^\s]+)/g

function Bubble({ text, onLink }: { text: FlowText; onLink?: (url: string) => void }) {
  const parts = text.body.split(URL_RE)
  return (
    <li data-slot="flow-text" data-channel={text.channel} className={cn("max-w-[19rem] rounded-2xl border border-border px-4 py-3 text-sm leading-relaxed text-foreground", text.channel === "text" ? "rounded-bl-sm bg-stone" : "bg-card")}>
      {text.subject && <p className="mb-1 font-semibold text-navy">{text.subject}</p>}
      <p className="break-words">
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <button key={i} type="button" onClick={() => onLink?.(p)} className="break-all text-left font-medium text-primary-deep underline underline-offset-2">
              {p.replace(/^https?:\/\/[^/]+/, "")}
            </button>
          ) : (
            p
          ),
        )}
      </p>
    </li>
  )
}

export function TextStrip({ texts, onLink, actions }: { texts: FlowText[]; onLink?: (url: string) => void; actions?: ReactNode }) {
  return (
    <aside data-slot="flow-texts" aria-label="Texts and emails Andrea gets" className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-primary-dark">What she gets by text and email</h2>
      {actions && <div className="mt-3">{actions}</div>}
      {texts.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nothing yet. Texts appear here as you go.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {texts.map((t) => (
            <Bubble key={t.id} text={t} onLink={onLink} />
          ))}
        </ol>
      )}
    </aside>
  )
}

export function FlowFrame({ steps, current, onStartOver, texts, onLink, actions, notice, children }: { steps: FlowStep[]; current: string; onStartOver: () => void; texts: FlowText[]; onLink?: (url: string) => void; actions?: ReactNode; notice?: ReactNode; children: ReactNode }) {
  const at = steps.findIndex((s) => s.key === current)
  return (
    <div data-slot="flow-frame" className="min-h-svh bg-cream">
      <nav aria-label="Flow" className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flow</p>
          <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {steps.map((s, i) => (
              <li key={s.key} aria-current={s.key === current ? "step" : undefined} className={cn("shrink-0 rounded-full px-3 py-1 text-sm", s.key === current ? "bg-navy font-semibold text-white" : i < at ? "bg-stone text-foreground" : "text-muted-foreground")}>
                {s.label}
              </li>
            ))}
          </ol>
          <Button variant="outline" size="sm" onClick={onStartOver}>
            Start over
          </Button>
        </div>
      </nav>
      {notice}
      <div className="flex flex-col lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">{children}</div>
        <div className="p-4 lg:sticky lg:top-16 lg:w-96 lg:shrink-0">
          <TextStrip texts={texts} onLink={onLink} actions={actions} />
        </div>
      </div>
    </div>
  )
}
