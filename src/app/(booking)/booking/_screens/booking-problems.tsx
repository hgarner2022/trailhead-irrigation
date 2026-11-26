"use client"

// A step's problems are shown the normal way: each message under its own field, in the field's own words, and focus goes to the first field that is wrong. There is no summary box (Hannah, Nov 26 2026).

/** A field that is missing something when Continue is pressed: outlined, with the message under it in the field's own words, and gone as soon as the choice is made. Wraps a control that has no error state of its own. */
export function StepField({ error, children }: { error?: string; children: React.ReactNode }) {
  return (
    <div data-invalid={error ? "true" : undefined} className={error ? "rounded-lg outline-2 outline-offset-4 outline-destructive/60" : undefined}>
      {children}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  )
}
