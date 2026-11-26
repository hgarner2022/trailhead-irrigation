"use client"

import { useState } from "react"
import type { Message } from "@/lib/admin/types"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"
import { ToastProvider } from "@/components/blocks/Toast"
import { Button } from "@/components/ui/button"
import { TripsPage } from "./JobPageTrips"
import { CollectBlock } from "./JobPageParts"
import { tripFacts } from "./TripBody"
import { crewText } from "./crew-copy"
import type { ScheduleResult } from "./ScheduleDialog"
import { FALL, SPRING, passPageFromTrips, tripOf, type TripState } from "./trip-fixtures"

// The Season Pass branch of the clickable flow (Hannah, Nov 19 2026): trip 1 goes Scheduled, Today, Active, Done, Charged with the same
// buttons the one-trip flow has, then trip 2 is the next one ahead and opens by itself. Move brings the trip to today, On my way makes it
// Active, Mark done asks "How is this paid?" at once (the card as agreed is chosen) and the charge turns the trip Charged, with a toast
// and a new row in the pass's Payments. Nothing is wired; only the data changes.

const STEPS: [string, TripState[]][] = [["Scheduled", ["scheduled"]], ["Today", ["today"]], ["Active", ["active"]], ["Done", ["done"]], ["Charged", ["charged"]]]
type Stages = { t1: TripState; t2: TripState }
type Crew = { people: string[]; instructions: string }
const START: Stages = { t1: "scheduled", t2: "scheduled" }
const NEXT: Partial<Record<string, TripState>> = { "On my way": "active", "Mark done": "done" }

function Strip({ stage, onReset }: { stage: TripState; onReset: () => void }) {
  const at = STEPS.findIndex(([, s]) => s.includes(stage))
  return (
    <nav aria-label="Flow" data-slot="flow-strip" className="mx-auto mb-4 flex max-w-6xl flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
      <span className="font-semibold text-navy">Trip 1</span>
      <ol className="flex flex-1 flex-wrap items-center gap-2">
        {STEPS.map(([name], i) => (
          <li key={name} aria-current={i === at ? "step" : undefined} className={i === at ? "rounded-full bg-navy px-3 py-1 font-medium text-white" : i < at ? "rounded-full bg-stone px-3 py-1" : "rounded-full px-3 py-1 text-muted-foreground"}>
            {i + 1}. {name}
          </li>
        ))}
        <li className={stage === "charged" ? "rounded-full bg-navy px-3 py-1 font-medium text-white" : "rounded-full px-3 py-1 text-muted-foreground"}>Trip 2 ahead</li>
      </ol>
      <Button size="touch" type="button" variant="outline" onClick={onReset}>Start over</Button>
    </nav>
  )
}

export function PassFlow() {
  const [st, setSt] = useState<Stages>(START)
  const [collecting, setCollecting] = useState<"t1" | "t2" | null>(null)
  const [crew, setCrew] = useState<Record<string, Crew>>({})
  const [crewMessages, setCrewMessages] = useState<Message[]>([])
  const trips = [tripOf(SPRING, "t1", st.t1, { day: st.t1 === "scheduled" ? undefined : "Today, Wed Nov 18", ...crew.t1 }), tripOf(FALL, "t2", st.t2, crew.t2)]
  const data = passPageFromTrips(trips)
  data.messages = [...crewMessages, ...data.messages]
  // Schedule or Move: the trip takes its people and instructions; a crew text is a Messages row to that person, never to the customer
  const onTripSchedule = (id: string, r: ScheduleResult) => {
    setCrew((c) => ({ ...c, [id]: { people: r.people, instructions: r.instructions } }))
    moveTo(id as "t1" | "t2", id === "t1" ? "today" : st.t2)
    if (r.crewText)
      setCrewMessages((m) => [...r.people.filter((p) => p !== "Ryan Garner").map((p, i): Message => ({ id: `crew-${m.length + i}`, clientId: "c-1", passId: "pass-1", channel: "sms", kind: "note", body: crewText({ day: r.day, time: r.time, address: "480 Briggs St", service: id === "t1" ? SPRING.title : FALL.title, instructions: r.instructions }), at: new Date(Date.UTC(2026, 10, 18, 17, 10 + m.length + i)).toISOString(), status: "delivered", toName: p })), ...m])
  }
  const moveTo = (id: "t1" | "t2", state: TripState) => setSt((s) => ({ ...s, [id]: state }))
  const onTripDo = (id: string, label: string) => {
    const next = NEXT[label]
    if (!next) return
    moveTo(id as "t1" | "t2", next)
    if (label === "Mark done") setCollecting(id as "t1" | "t2")
  }
  const handlers = (id: string) => ({ onCharge: async () => ({ ok: true as const }), onDone: () => (moveTo(id as "t1" | "t2", "charged"), setCollecting(null)), onClose: () => setCollecting(null), onLater: () => setCollecting(null) })
  const open = collecting ? trips.find((t) => t.id === collecting)?.trip : undefined
  // the first trip still open is the one shown open: the page starts over when it changes, so trip 2 opens once trip 1 is charged
  const key = trips.find((t) => t.trip && t.trip.state !== "charged")?.id ?? "none"
  return (
    <ToastProvider>
      <Strip stage={st.t1} onReset={() => (setSt(START), setCollecting(null))} />
      <TripsPage key={key} data={data} onTripDo={onTripDo} tripHandlers={handlers} onTripSchedule={onTripSchedule} />
      {open && collecting && st[collecting] === "done" && open.collect && (
        <ConfirmDialog open onOpenChange={(o) => !o && setCollecting(null)} title="How is this paid?" actions="none" size="md" slot="flow-collect">
          <CollectBlock bare collect={open.collect} facts={tripFacts(open)} handlers={handlers(collecting)} />
        </ConfirmDialog>
      )}
    </ToastProvider>
  )
}
