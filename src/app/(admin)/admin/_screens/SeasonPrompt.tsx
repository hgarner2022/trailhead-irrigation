"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import type { SeasonWindow } from "@/lib/admin/types"
import { windowTitle } from "./home-model"

// The prompt Home shows when a season window is a few weeks out: check the
// trucks, capacity and areas in Settings, then propose the schedule.
// Client only for the Propose button, which logs in the prototype.

export function SeasonPrompt({ window }: { window: SeasonWindow }) {
  return (
    <Card data-slot="season-prompt" className="border-primary/30 bg-primary/10">
      <CardHeader>
        <CardTitleHeading>{windowTitle(window)}</CardTitleHeading>
        <p className="text-sm text-foreground">Check the trucks, capacity and areas, then propose the schedule.</p>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <a href="/admin/settings">Open settings</a>
        </Button>
        <Button onClick={() => console.info("propose schedule", window.kind, window.opensOn)}>Propose schedule</Button>
      </CardContent>
    </Card>
  )
}
