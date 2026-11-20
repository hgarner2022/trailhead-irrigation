"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { ORIGIN } from "./fixtures"

// An email as an inbox shows it: the From and Subject lines over the real HTML in a frame at the customer's width, with a switch to its plain-text twin and, on the
// proposed layout, to the dark palette. The HTML is exactly what the renderer returns; only the image addresses are pointed at this Storybook's own /images.

export interface MailFrameProps {
  subject: string
  html: string
  text: string
  /** the width of the customer's screen: 600 on a laptop, 375 on a phone */
  width: number
  /** "Current" or "Proposed" */
  label: string
  /** the proposed layout answers to the dark switch */
  dark?: boolean
  to?: string
}

const local = (html: string) => html.replaceAll(`${ORIGIN}/images/`, "/images/")
/** `@media (prefers-color-scheme:dark)` made always-on, so the dark palette can be looked at without changing the computer's setting. */
const forceDark = (html: string) => html.replace("@media (prefers-color-scheme:dark)", "@media all")

export function MailFrame({ subject, html, text, width, label, dark = false, to = "andrea@example.com" }: MailFrameProps) {
  const [tab, setTab] = useState<"email" | "text">("email")
  const [night, setNight] = useState(false)
  const [height, setHeight] = useState(900)
  const ref = useRef<HTMLIFrameElement>(null)
  const measure = () => {
    const doc = ref.current?.contentDocument
    if (doc) setHeight(Math.max(240, doc.documentElement.scrollHeight))
  }
  const tabClass = (on: boolean) => cn("min-h-9 rounded-md border px-3 text-sm font-medium", on ? "border-navy bg-navy text-white" : "border-border bg-white text-foreground")
  return (
    <figure data-slot="mail-frame" className="mx-auto w-full" style={{ maxWidth: width + 2 }}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", label === "Proposed" ? "bg-primary-dark text-white" : "bg-stone text-foreground")}>{label}</span>
        <div className="flex gap-2" role="group" aria-label={`${label} email view`}>
          <button type="button" aria-pressed={tab === "email"} className={tabClass(tab === "email")} onClick={() => setTab("email")}>Email</button>
          <button type="button" aria-pressed={tab === "text"} className={tabClass(tab === "text")} onClick={() => setTab("text")}>Plain text</button>
          {dark && tab === "email" && (
            <button type="button" aria-pressed={night} className={tabClass(night)} onClick={() => setNight((n) => !n)}>Dark</button>
          )}
        </div>
      </div>
      <figcaption className="rounded-t-lg border border-b-0 border-border bg-stone px-3 py-2 text-sm text-foreground">
        <p><span className="text-muted-foreground">From </span>Trailhead Lawn &amp; Irrigation</p>
        <p><span className="text-muted-foreground">To </span>{to}</p>
        <p className="font-semibold">{subject}</p>
      </figcaption>
      {tab === "email" ? (
        <iframe ref={ref} title={`${label}: ${subject}`} srcDoc={local(night ? forceDark(html) : html)} onLoad={measure} style={{ width: "100%", height }} className="block rounded-b-lg border border-border bg-white" />
      ) : (
        <pre data-slot="plain-text" className="overflow-x-auto whitespace-pre-wrap break-words rounded-b-lg border border-border bg-white p-4 font-mono text-[13px] leading-relaxed text-foreground">{text}</pre>
      )}
    </figure>
  )
}
