"use client"

import Link from "next/link"
import { useRef } from "react"
import { ConfirmDialog } from "@/components/blocks/ConfirmDialog"

// "Leave without booking?" (docs/plans/2026-11-19-booking-form-design.md, "Navigation and close"): the dialog Close opens once something is entered, and the link it goes to when the customer says Leave, a real
// link so the host can catch it. Pure props, client component.

export function LeaveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const leaveLink = useRef<HTMLAnchorElement>(null)
  return (
    <>
      <Link ref={leaveLink} href="/" tabIndex={-1} aria-hidden className="sr-only">
        Back to the website
      </Link>
      <ConfirmDialog title="Leave without booking?" message="Your answers aren't saved." confirmLabel="Leave" dismissLabel="Keep booking" open={open} onOpenChange={onOpenChange} onConfirm={async () => (leaveLink.current?.click(), { ok: true })} />
    </>
  )
}
