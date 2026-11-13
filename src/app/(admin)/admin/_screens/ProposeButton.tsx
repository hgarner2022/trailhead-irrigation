"use client"

import { Button } from "@/components/ui/button"
import type { SeasonWindow } from "@/lib/admin/types"

// The one client piece of Home's season prompt: Propose logs in the prototype
// and will call the scheduler's propose action when it is wired.
export function ProposeButton({ season }: { season: SeasonWindow }) {
  return <Button onClick={() => console.info("propose schedule", season.kind, season.opensOn)}>Propose schedule</Button>
}
