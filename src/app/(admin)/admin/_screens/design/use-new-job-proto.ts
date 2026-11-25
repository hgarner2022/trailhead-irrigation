"use client"

import { useEffect, useMemo, useState } from "react"
import type { Person } from "@/lib/admin/types"
import { sortOpenings, type OpeningSort } from "@/components/blocks/find-a-time-model"
import type { FindATimeState } from "@/components/blocks/FindATime"
import type { Opening } from "@/components/blocks/scheduler-panels-types"
import type { GridBlock } from "@/components/blocks/time-grid-model"
import { CUSTOMERS, SERVICES, lengthWords, pointNear, townOf } from "./schedule-prototype-data"
import { openingsFor, startOf } from "./schedule-prototype-find"
import type { Meta, ProtoJob, ProtoState } from "./schedule-prototype-model"

// The New job sheet's state for the prototype (docs/plans/2026-11-25-scheduler-design.md, 7.7): customer, address and service, then Find a time. Picking a row
// is what lights the calendar and the map: `ghost` is the dotted block and `ghostPin` the hollow pin. The same sheet runs "Find a time" for a job already in
// Unscheduled (`job` set): the customer and service are that job's.

export interface NewJobInit { open?: boolean; customerId?: string; address?: string; service?: string; search?: "idle" | "searching" | "done"; pickId?: string }
export interface Draft { customerId: string; address: string; service: string; search: "idle" | "searching" | "done"; sort: OpeningSort; pickId: string | null; ticked: boolean }

const street = (address: string) => (address.split(",")[0] ?? address).replace(/^\d+\s+/, "").trim() || "New visit"
const BLANK: Draft = { customerId: "", address: "", service: "turn-on", search: "idle", sort: "recommended", pickId: null, ticked: false }

export function useNewJobProto(o: { state: ProtoState; people: readonly Person[]; today: string; findDelayMs?: number; init?: NewJobInit }) {
  const { state, people, today, findDelayMs = 450, init } = o
  const [open, setOpen] = useState(init?.open ?? false)
  const [job, setJob] = useState<ProtoJob | null>(null)
  const [draft, setDraft] = useState<Draft>(() => {
    const c = CUSTOMERS.find((x) => x.id === init?.customerId)
    return { ...BLANK, customerId: c?.id ?? "", address: init?.address ?? c?.address ?? "", service: init?.service ?? "turn-on", search: init?.search ?? "idle", pickId: init?.pickId ?? null }
  })
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const service = SERVICES.find((s) => s.key === draft.service) ?? SERVICES[0]!
  const town = job ? job.town : townOf(draft.address)
  const minutes = job ? job.minutes : service.minutes
  const customer = CUSTOMERS.find((c) => c.id === draft.customerId)

  useEffect(() => {
    if (draft.search !== "searching") return
    const t = setTimeout(() => setDraft((d) => (d.search === "searching" ? { ...d, search: "done" } : d)), findDelayMs)
    return () => clearTimeout(t)
  }, [draft.search, findDelayMs])

  const found = useMemo(() => (draft.search === "done" && town ? openingsFor({ state, people, town, minutes, today }) : { openings: [] as Opening[], forced: [] as Opening[] }), [draft.search, town, state, people, minutes, today])
  const findState: FindATimeState = job === null && draft.address.trim() === "" ? "no-address" : draft.search === "searching" ? "searching" : draft.search === "idle" ? "ready" : !town ? "outside" : found.openings.length === 0 ? "none" : "results"

  const pick = [...found.openings, ...found.forced].find((r) => r.id === draft.pickId) ?? null
  const who = job ? job.customer : customer?.name ?? "New customer"
  const serviceName = job ? job.service : service.name
  const label = job ? job.street : street(draft.address)
  const point = job ? { lat: job.lat ?? 40.05, lng: job.lng ?? -105.05 } : pointNear(town ?? "Erie", draft.address || "new")

  /** The dotted block on the grid for the chosen row. */
  const ghost: GridBlock | null = pick
    ? { id: "ghost", day: pick.day, personId: pick.personId, start: startOf(pick), minutes, title: label, name: who.split(" ")[0] ?? who, kind: job ? job.kind : service.kind, town: town ?? "Erie", service: serviceName, planned: { day: pick.day, personId: pick.personId, start: null } }
    : null
  const ghostPin = pick ? { id: "ghost", ...point, name: who } : null

  return {
    open, job, draft, set, found, findState, pick, ghost, ghostPin, customer, service, town, minutes, who, serviceName, label,
    sorted: sortOpenings(found.openings, draft.sort),
    start: (j: ProtoJob | null) => { setJob(j); setDraft(j ? { ...BLANK, search: "searching" } : BLANK); setOpen(true) },
    close: () => setOpen(false),
    find: () => set({ search: "searching", pickId: null, ticked: false }),
    /** Add job and Place read the chosen row; false when nothing is chosen or a forced row is not ticked. */
    canAdd: Boolean(pick) && (!pick?.conflict || draft.ticked),
    /** the visit Add job makes from the chosen row */
    visit(id: string): { visit: GridBlock; meta: Meta } | null {
      if (!pick || job) return null
      return { visit: { id, day: pick.day, personId: pick.personId, start: startOf(pick), minutes, title: label, name: who.split(" ")[0] ?? who, kind: service.kind, town: town ?? "Erie", service: serviceName, notTold: true }, meta: { customer: who, phone: customer?.phone, email: customer?.email, ...point } }
    },
    /** the job "Add without a day" leaves in Unscheduled */
    unscheduledJob(id: string): ProtoJob | null {
      if (job || !draft.address.trim() || !town) return null
      return { id, customer: who, town, service: serviceName, length: lengthWords(minutes), minutes, kind: service.kind, street: label, addedOn: today, phone: customer?.phone, email: customer?.email, ...point }
    },
  }
}
