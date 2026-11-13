"use client"

import { Button } from "@/components/ui/button"
import type { SeasonWindow } from "@/lib/admin/types"

const WORDS: Record<SeasonWindow["kind"], string> = { "turn-on": "spring", inspection: "July", blowout: "fall" }

// The one client piece of Home's season prompt: Schedule logs in the
// prototype and will run the scheduler (wiring plan, Phase 10) when it is
// wired, the same as the Schedule button on the Schedule page.
export function ScheduleSeasonButton({ season }: { season: SeasonWindow }) {
  return <Button onClick={() => console.info("schedule season", season.kind, season.opensOn)}>{`Schedule the ${WORDS[season.kind]}`}</Button>
}
