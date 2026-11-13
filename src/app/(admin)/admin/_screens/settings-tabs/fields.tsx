"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Actor, SettingsState } from "../settings-model"

/** What a tab calls to change the settings: a reducer and its arguments are applied and logged by the screen. */
export type Apply = (change: (state: SettingsState, actor: Actor) => SettingsState) => void

export interface CommitInputProps {
  value: string | number
  label: string
  onCommit: (raw: string) => void
  type?: "text" | "number" | "date"
  min?: number
  max?: number
  className?: string
  describedBy?: string
}

/**
 * An input that changes the settings when the person leaves it or presses
 * Enter, not on every keystroke, so the change log gets one line per edit.
 *
 * Revert on invalid: a blank value, or a number that is not a whole number
 * inside min and max, snaps back to what it was without calling `onCommit`.
 * A value the reducer then refuses (a window that would close before it
 * opens, say) comes back the same way: after every commit the draft is set
 * back to the `value` prop, and when the prop did change the draft follows it
 * in the same render. The field keeps focus throughout; it is never remounted.
 */
export function CommitInput({ value, label, onCommit, type = "text", min, max, className, describedBy }: CommitInputProps) {
  const [draft, setDraft] = useState(String(value))
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    setDraft(String(value))
  }
  const commit = () => {
    const raw = draft.trim()
    const n = Number(raw)
    const bad = raw === "" || (type === "number" && (!Number.isInteger(n) || (min !== undefined && n < min) || (max !== undefined && n > max)))
    if (!bad && raw !== String(value)) onCommit(raw)
    setDraft(String(value))
  }
  return (
    <Input
      aria-label={label}
      aria-describedby={describedBy}
      type={type}
      min={min}
      max={max}
      inputMode={type === "number" ? "numeric" : undefined}
      value={draft}
      className={className}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit()
      }}
    />
  )
}

export interface ConfirmButtonProps {
  label: string
  title: string
  description: string
  confirm: string
  onConfirm: () => void
}

/** A ghost button that asks before it acts: a dialog with the consequence in words and a Cancel beside the confirm. */
export function ConfirmButton({ label, title, description, confirm, onConfirm }: ConfirmButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={label}>
          {label.split(" ")[0]}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button onClick={onConfirm}>{confirm}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
