"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"

// The Messages block's "Check delivery" (docs/DATA_MODEL.md, message_log.delivery_status): asks Twilio what became of the newest texts and
// says how many it checked; the block then reads "Delivered" or "Not delivered" from the refreshed data. `onCheck` is a server action in the app;
// without it (the catalog) the button only logs. A refusal shows its words.

export type CheckDeliveryResult = { ok: true; data: number } | { ok: false; message: string }

export function CheckDeliveryButton({ onCheck }: { onCheck?: () => Promise<CheckDeliveryResult> }) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState("")
  const run = () => {
    if (!onCheck) return console.info("check delivery")
    start(async () => {
      const result = await onCheck()
      setNote(result.ok ? (result.data === 0 ? "Nothing to check." : `Checked ${result.data}.`) : result.message)
    })
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span role="status" className="text-xs text-muted-foreground empty:hidden">
        {note}
      </span>
      <Button type="button" variant="outline" size="touch-sm" disabled={pending} onClick={run}>
        {pending ? "Checking" : "Check delivery"}
      </Button>
    </span>
  )
}
