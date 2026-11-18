"use client"

import { useEffect, useMemo, useRef, useState, useTransition, type Dispatch, type SetStateAction } from "react"
import { trayLine } from "@/components/blocks/ToScheduleTray"
import type { AdminData, Person, Visit } from "@/lib/admin/types"
import { TIME_ZONE, writtenDate } from "@/lib/admin/format"
import type { Outcome } from "./action-types"
import { placeAllPlan, placeDayWords, placed, placeFor, plainRefusal, restoreVisit, withPlacements, type PlaceContext, type PlaceResult, type Placement } from "./place-model"
import { trayItems, type TrayItem } from "./schedule-model"
import { useTextingQueue } from "./use-texting-queue"

// Place and Place all on the Schedule (docs/plans/2026-11-18-admin-holistic-design.md, 5.2). A press books nothing yet: the placement shows on the week at once and the customer's text waits
// a minute under a strip (`useTextingQueue`); Undo inside the minute puts the job back on the list and sends nothing. When the minute is up the
// one Move call goes (`onMove`, the API's visits.move: the hard rules, the day ordered, the date text), and a refusal shows its words under the
// job's row and takes the job back off the week. The state that holds it all lives here so the screen file stays a layout.

export interface PlacingArgs {
  data: AdminData
  /** the visits the screen holds (the server's, plus the optimistic moves) */
  visits: Visit[]
  setVisits: Dispatch<SetStateAction<Visit[]>>
  people: Person[]
  /** the calendar day today is */
  todayDay: string
  onMove?: (visitId: string, personId: string, dayIso: string) => Promise<Outcome>
  /** the minute before the text; 0 books at once */
  seconds: number
  announce: (words: string) => void
  /** highlight the job on the week */
  highlight: (visitId: string) => void
}

const NO_PEOPLE = "Add a person with a truck in Settings, then place the job."
const forgetIn = (ids: string[]) => (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([id]) => !ids.includes(id)))

export function usePlacing({ data, visits, setVisits, people, todayDay, onMove, seconds, announce, highlight }: PlacingArgs) {
  const [pending, setPending] = useState<Placement[]>([])
  const [problems, setProblems] = useState<Record<string, string>>({})
  const [noRoom, setNoRoom] = useState<Record<string, string>>({})
  const [plan, setPlan] = useState<PlaceResult[] | null>(null)
  const [, start] = useTransition()
  const queue = useTextingQueue(seconds)
  const server = useRef(data.visits)
  useEffect(() => {
    server.current = data.visits
  })

  const shown = useMemo(() => withPlacements(visits, pending, TIME_ZONE), [visits, pending])
  const tray = useMemo(() => trayItems({ visits: shown, passes: data.passes }), [shown, data.passes])
  const context = (): PlaceContext => ({ visits: shown, people, areas: data.settings.areas, windows: data.settings.windows, blocks: data.blocks, today: todayDay, timeZone: TIME_ZONE })

  const scheduled = (p: Placement) => `${p.item.clientName} is scheduled with ${p.personName} for ${writtenDate(p.day)}, and we texted the date. Drag it if another day is better.`
  const many = (n: number) => `${n} jobs scheduled. The customers have their dates.`

  /** The minute is up: the visits book, the API texts, and a refusal comes back under its row. */
  const commit = (all: Placement[]) => {
    // A job that got a day while the minute ran (the customer picked one, the office moved it) is left as it is: this placement is stale.
    const placements = all.filter((p) => !server.current.find((v) => v.id === p.item.id)?.startAt)
    const ids = all.map((p) => p.item.id)
    setPending((p) => p.filter((x) => !ids.includes(x.item.id)))
    if (placements.length === 0) return
    setVisits((v) => withPlacements(v, placements, TIME_ZONE))
    if (!onMove) {
      for (const p of placements) console.info("place visit", p.item.id, p.personId, p.day)
      return announce(placements.length === 1 ? scheduled(placements[0]!) : many(placements.length))
    }
    start(async () => {
      const outs = await Promise.all(placements.map((p) => onMove(p.item.id, p.personId, p.day)))
      const refused = placements.flatMap((p, i) => (outs[i]!.ok ? [] : [{ id: p.item.id, message: plainRefusal((outs[i] as { message: string }).message) }]))
      if (refused.length) {
        setVisits((v) => refused.reduce((acc, r) => restoreVisit(acc, r.id, server.current), v))
        setProblems((m) => ({ ...m, ...Object.fromEntries(refused.map((r) => [r.id, r.message])) }))
      }
      const ok = placements.filter((_, i) => outs[i]!.ok)
      if (ok.length) announce(ok.length === 1 ? scheduled(ok[0]!) : many(ok.length))
    })
  }

  const queuePlacements = (placements: Placement[]) => {
    if (placements.length === 0) return
    const ids = placements.map((p) => p.item.id)
    setProblems(forgetIn(ids))
    setNoRoom(forgetIn(ids))
    setPending((p) => [...p, ...placements])
    highlight(ids[0]!)
    queue.add(
      placements.map((p) => p.item.clientName.split(" ")[0]!),
      () => commit(placements),
      () => {
        setPending((p) => p.filter((x) => !ids.includes(x.item.id)))
        announce("Nothing was sent. The job is back on the list.")
      },
    )
  }

  const place = (item: TrayItem) => {
    const result = people.length === 0 ? ({ ok: false, item, reason: NO_PEOPLE } as const) : placeFor(item, context())
    if (result.ok) return queuePlacements([result.placement])
    setProblems(forgetIn([item.id]))
    setNoRoom((m) => ({ ...m, [item.id]: result.reason }))
  }

  const confirmPlaceAll = () => {
    const current = plan ?? []
    setPlan(null)
    setNoRoom((m) => ({ ...m, ...Object.fromEntries(current.flatMap((r) => (r.ok ? [] : [[r.item.id, r.reason]]))) }))
    queuePlacements(placed(current))
  }

  const rows = (plan ?? []).map((r) => ({
    id: r.item.id,
    who: `${r.item.clientName}, ${r.item.town}`,
    what: trayLine(r.item),
    where: r.ok ? `${placeDayWords(r.placement.day)}, ${r.placement.personName}` : undefined,
    problem: r.ok ? undefined : r.reason,
  }))
  const strips = queue.batches.map((b) => ({ id: b.id, names: b.names, secondsLeft: queue.secondsLeft(b), undo: () => queue.undo(b.id) }))
  return {
    /** the visits with the waiting placements laid on */
    shown,
    tray,
    problems,
    noRoom,
    strips,
    rows,
    /** a job whose Place is still inside its minute */
    isPending: (visitId: string) => pending.some((p) => p.item.id === visitId),
    place,
    previewOpen: plan !== null,
    openPlaceAll: () => setPlan(people.length === 0 ? tray.filter((i) => !i.awaitingPick).map((item) => ({ ok: false as const, item, reason: NO_PEOPLE })) : placeAllPlan(tray, context())),
    closePlaceAll: () => setPlan(null),
    confirmPlaceAll,
  }
}
