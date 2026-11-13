"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import type { SeasonWindow } from "@/lib/admin/types"
import type { Outcome } from "./action-types"

const WORDS: Record<SeasonWindow["kind"], string> = { "turn-on": "spring", inspection: "July", blowout: "fall" }

// The one client piece of Home's season prompt: Schedule runs the scheduler for the window that is opening
// (`onSchedule` is the `runSchedule` server action), the same as the Schedule button on the Schedule page.
// Without `onSchedule` (the catalog) it only logs. The result is said under the button.
export function ScheduleSeasonButton({ season, onSchedule }: { season: SeasonWindow; onSchedule?: (window: SeasonWindow["kind"]) => Promise<Outcome<{ placed: number; unplaced: number }>> }) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState("")
  const run = () => {
    if (!onSchedule) return console.info("schedule season", season.kind, season.opensOn)
    start(async () => {
      const out = await onSchedule(season.kind)
      if (!out.ok) return setNote(out.message)
      const { placed, unplaced } = out.data
      setNote(`${placed} ${placed === 1 ? "visit" : "visits"} scheduled${unplaced ? `, ${unplaced} could not be placed (listed below)` : ""}.`)
    })
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <Button onClick={run} disabled={pending}>{`Schedule the ${WORDS[season.kind]}`}</Button>
      <p role="status" className="text-sm text-muted-foreground empty:hidden">
        {note}
      </p>
    </div>
  )
}
