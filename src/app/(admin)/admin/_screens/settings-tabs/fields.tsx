"use client"

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
 * A blank text or a number outside min and max snaps back to what it was.
 */
export function CommitInput({ value, label, onCommit, type = "text", min, max, className, describedBy }: CommitInputProps) {
  const commit = (el: HTMLInputElement) => {
    const raw = el.value.trim()
    const n = Number(raw)
    const bad = raw === "" || (type === "number" && (!Number.isInteger(n) || (min !== undefined && n < min) || (max !== undefined && n > max)))
    if (bad) el.value = String(value)
    else if (raw !== String(value)) onCommit(raw)
  }
  return (
    <Input
      key={String(value)}
      aria-label={label}
      aria-describedby={describedBy}
      type={type}
      min={min}
      max={max}
      inputMode={type === "number" ? "numeric" : undefined}
      defaultValue={value}
      className={className}
      onBlur={(e) => commit(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(e.currentTarget)
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
