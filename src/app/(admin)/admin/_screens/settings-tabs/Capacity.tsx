"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CardTitleHeading } from "@/components/blocks/CardTitleHeading"
import { WINDOW_KINDS, WINDOW_NAMES, setBuffer, setWindow, type SettingsState } from "../settings-model"
import { CommitInput, type Apply } from "./fields"

// The scheduling rules that are numbers and dates: how much of a truck-day
// is held back and when each season's visits may land. The line under each
// field is the rule from the system plan, in words.

function Field({ id, label, hint, children }: { id: string; label: string; hint: string; children: (describedBy: string) => React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {children(`${id}-hint`)}
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        {hint}
      </p>
    </div>
  )
}

export function Capacity({ state, apply }: { state: SettingsState; apply: Apply }) {
  const { bufferPercentEarly, bufferPercentLate, windows } = state.settings
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitleHeading>Buffer</CardTitleHeading>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field id="buffer-early" label="Held back in a season's first two weeks (percent)" hint="Capacity per truck-day minus this much, left for repairs and weather. The plan starts at 20 to 25.">
            {(d) => <CommitInput type="number" min={0} max={100} label="Buffer, first two weeks, percent" describedBy={d} value={bufferPercentEarly} onCommit={(v) => apply((s, a) => setBuffer(s, "early", Number(v), a))} />}
          </Field>
          <Field id="buffer-late" label="Held back after the first two weeks (percent)" hint="The same hold-back once the season settles. The plan uses 10 to 15.">
            {(d) => <CommitInput type="number" min={0} max={100} label="Buffer, after the first two weeks, percent" describedBy={d} value={bufferPercentLate} onCommit={(v) => apply((s, a) => setBuffer(s, "late", Number(v), a))} />}
          </Field>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitleHeading>Season windows</CardTitleHeading>
          <p className="text-sm text-muted-foreground">A visit never leaves its window, and the scheduler opens a season this many weeks before it starts.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {WINDOW_KINDS.map((kind) => {
            const season = windows.find((w) => w.kind === kind)
            if (!season) return null
            return (
              <fieldset key={kind} className="grid gap-4 sm:grid-cols-3">
                <legend className="mb-3 font-display text-sm uppercase tracking-wide text-muted-foreground">{WINDOW_NAMES[kind]}</legend>
                <Field id={`${kind}-opens`} label="Opens" hint="The first day a visit may land.">
                  {(d) => <CommitInput type="date" label={`${WINDOW_NAMES[kind]} opens`} describedBy={d} value={season.opensOn} onCommit={(v) => apply((s, a) => setWindow(s, kind, "opensOn", v, a))} />}
                </Field>
                <Field id={`${kind}-closes`} label="Closes" hint="The last day a visit may land.">
                  {(d) => <CommitInput type="date" label={`${WINDOW_NAMES[kind]} closes`} describedBy={d} value={season.closesOn} onCommit={(v) => apply((s, a) => setWindow(s, kind, "closesOn", v, a))} />}
                </Field>
                <Field id={`${kind}-lead`} label="Lead weeks" hint="Home prompts you to set the season up this many weeks ahead, plus two.">
                  {(d) => <CommitInput type="number" min={0} label={`${WINDOW_NAMES[kind]} lead weeks`} describedBy={d} value={season.leadWeeks} onCommit={(v) => apply((s, a) => setWindow(s, kind, "leadWeeks", Number(v), a))} />}
                </Field>
              </fieldset>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
