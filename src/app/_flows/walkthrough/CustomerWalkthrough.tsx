"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { STEPS, type StepKey } from "./routes"
import { STEP_COPY } from "./step-copy"

// The customer side as a presentation (Hannah, Nov 19 2026), not a phone-width page: at laptop width, a Steps column on the left and a phone in the
// middle. The phone is a real 375 by 812 device frame holding the real screens in an iframe of their own, so every width rule inside it is the
// phone's. The Steps column is the only navigation: the list, Back and Next, Start over. It sends the phone a message and is told which step
// is lit, derived by the phone from the screen it is showing. Nothing is sent anywhere.

const PHONE_ID = "customer-walkthrough-clickable--phone-screens"
const PHONE_SRC = `iframe.html?id=${PHONE_ID}&viewMode=story`
const FRAME_W = 399
const FRAME_H = 836

function useScale() {
  const [scale, set] = useState(1)
  useEffect(() => {
    const fit = () => set(Math.min(1, (window.innerHeight - 32) / FRAME_H))
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [])
  return scale
}

export function CustomerWalkthrough() {
  const frame = useRef<HTMLIFrameElement>(null)
  const [step, setStep] = useState<StepKey | "none">("book")
  const [run, setRun] = useState(0)
  const [card, setCard] = useState<"none" | "saved">("none")
  const scale = useScale()
  const at = STEPS.findIndex((s) => s.key === step)
  const chooseCard = (c: "none" | "saved") => (setCard(c), tell("payCard", { card: c }))
  const tell = useCallback((cmd: string, extra?: object) => frame.current?.contentWindow?.postMessage({ walk: "cmd", cmd, ...extra }, "*"), [])
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const m = e.data as { walk?: string; step?: StepKey } | null
      if (m?.walk === "state" && m.step) setStep(m.step)
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])
  return (
    <div data-slot="customer-walkthrough" className="flex min-h-svh items-center justify-center gap-12 bg-stone px-6 py-4">
      <nav aria-label="Steps" className="w-80 shrink-0">
        <h1 className="font-display text-3xl font-semibold text-navy">Steps</h1>
        <ol className="mt-4 flex flex-col gap-1">
          {STEPS.map((s, i) => {
            const on = s.key === step
            return (
              <li key={s.key}>
                <button type="button" aria-current={on ? "step" : undefined} onClick={() => tell("go", { step: s.key })} className={cn("flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-base", on ? "bg-navy font-semibold text-white" : "text-foreground hover:bg-card")}>
                  <span aria-hidden className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", on ? "bg-primary text-white" : "bg-card text-navy")}>{i + 1}</span>
                  {s.label}
                </button>
                {on && (
                  <div className="mt-2 mb-3 rounded-lg border border-border bg-card p-4">
                    <p data-slot="step-line" className="text-base text-foreground">{STEP_COPY[s.key].line}</p>
                    <div className="mt-4 flex gap-2">
                      <button type="button" disabled={at <= 0} onClick={() => tell("back")} className="min-h-11 flex-1 rounded-lg border border-input bg-background text-base font-medium text-foreground disabled:opacity-40">‹ Back</button>
                      <button type="button" disabled={at >= STEPS.length - 1} onClick={() => tell("next")} className="min-h-11 flex-[2] rounded-lg bg-primary-dark text-lg font-semibold text-white disabled:opacity-40">Next ›</button>
                    </div>
                    {s.key === "pay" && (
                      <div data-slot="prototype-control" role="group" aria-label="Prototype only" className="mt-4 border-t border-border pt-3">
                        <p className="text-sm font-semibold text-navy">Prototype only</p>
                        <p className="text-sm text-muted-foreground">Does Andrea have a card on file when she opens the pay page?</p>
                        <div className="mt-2 flex gap-2">
                          <button type="button" aria-pressed={card === "none"} onClick={() => chooseCard("none")} className={cn("min-h-10 flex-1 rounded-lg border text-sm font-medium", card === "none" ? "border-navy bg-navy text-white" : "border-input bg-background text-foreground")}>No card on file</button>
                          <button type="button" aria-pressed={card === "saved"} onClick={() => chooseCard("saved")} className={cn("min-h-10 flex-1 rounded-lg border text-sm font-medium", card === "saved" ? "border-navy bg-navy text-white" : "border-input bg-background text-foreground")}>Card on file</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
        <button type="button" onClick={() => (setStep("book"), setCard("none"), setRun((n) => n + 1))} className="mt-4 min-h-11 rounded-lg px-3 text-base font-medium text-primary-dark underline underline-offset-2">Start over</button>
      </nav>
      <div style={{ width: FRAME_W * scale, height: FRAME_H * scale }} className="shrink-0">
        <div style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})`, transformOrigin: "top left" }} className="rounded-[52px] bg-navy p-3 shadow-2xl">
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[40px] bg-white">
            <div aria-hidden className="relative flex h-8 shrink-0 items-center justify-between bg-white px-7 text-xs font-semibold text-black">
              <span>9:41</span>
              <span className="absolute left-1/2 top-1.5 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
              <span>100%</span>
            </div>
            <iframe key={run} ref={frame} title="The customer's phone" src={PHONE_SRC} className="w-full flex-1 border-0 bg-white" />
            <div aria-hidden className="flex h-5 shrink-0 items-start justify-center bg-white"><span className="mt-1 h-1 w-32 rounded-full bg-black/80" /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
