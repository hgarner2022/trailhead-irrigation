"use client"

import { useEffect, useMemo, useState } from "react"
import type { PlanStatus } from "@/components/blocks/PlanStrip"
import type { GridBlock } from "@/components/blocks/time-grid-model"
import { PLAN_DRAFT, PLAN_SAVED_MINUTES, planBlocks, planMoves } from "./schedule-prototype-data"
import type { Action } from "./schedule-prototype-model"

// Ask Jev for the prototype (docs/plans/2026-11-25-scheduler-design.md, 7.11): "Jev is working" for a moment, then a draft whose moves are drawn dotted on the clock. Accept
// applies the ticked moves through the same reducer a drag uses (one toast, the visits join Not told); Throw away clears it. Nothing here calls a model: the draft is a fixture.

export function useJevProto(o: { visits: readonly GridBlock[]; dispatch: (a: Action) => void; delayMs?: number; init?: PlanStatus | null }) {
  const { visits, dispatch, delayMs = 1400, init = null } = o
  const [status, setStatus] = useState<PlanStatus | null>(init)
  const [hover, setHover] = useState<string | null>(null)

  useEffect(() => {
    if (status !== "drafting") return
    const t = setTimeout(() => setStatus((s) => (s === "drafting" ? "ready" : s)), delayMs)
    return () => clearTimeout(t)
  }, [status, delayMs])

  const moves = useMemo(() => (status === "ready" ? planMoves(visits) : []), [status, visits])
  const planned = useMemo(() => (status === "ready" ? planBlocks(visits) : []), [status, visits])
  return {
    status, moves, planned, savedMinutes: PLAN_SAVED_MINUTES,
    /** the plan's block under the pointer, as the grid's hover id */
    hoverId: hover ? `plan-${hover}` : null,
    ask: () => setStatus("drafting"),
    cancel: () => setStatus(null),
    discard: () => setStatus(null),
    hover: setHover,
    accept: (ids: string[]) => {
      const chosen = PLAN_DRAFT.filter((d) => ids.includes(d.id) && d.kind !== "stale")
      dispatch({ type: "apply-plan", moves: chosen.map((d) => ({ id: d.visitId, to: d.to })) })
      setStatus(null)
      setHover(null)
    },
  }
}
