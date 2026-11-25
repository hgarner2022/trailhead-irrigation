import { CHOOSE, LOOK, TRY } from "./schedule-start-here"

// The Docs page "Start here: Scheduler (Nov 25)": written for the owner, not for a developer. What to look at (each a link to its story), what to try, and the three
// things she is asked to choose. Links open in the Storybook window (`target="_top"`), not inside the docs frame.

const href = (id: string) => `/?path=/story/${id}`
const LINK = "font-semibold text-primary-dark underline underline-offset-2"

export function ScheduleStartHere() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 text-base leading-7 text-foreground">
      <header>
        <h1 className="font-display text-3xl font-semibold text-navy">Start here: Scheduler (Nov 25)</h1>
        <p className="mt-2">This is the new Schedule, drawn over made-up visits so you can try it. Nothing is saved and nothing is sent to anyone.</p>
      </header>
      <section aria-labelledby="look">
        <h2 id="look" className="font-display text-2xl font-semibold text-navy">What to look at</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          {LOOK.map((s) => (
            <li key={s.id}>
              <a href={href(s.id)} target="_top" className={LINK}>{s.label}</a>
              {". "}
              {s.look}
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="try">
        <h2 id="try" className="font-display text-2xl font-semibold text-navy">What you can try</h2>
        <p className="mt-1 text-muted-foreground">Open the Week story first, then:</p>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          {TRY.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="choose">
        <h2 id="choose" className="font-display text-2xl font-semibold text-navy">Three things to choose</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6">
          {CHOOSE.map((c) => (
            <li key={c.label}>
              <span className="font-semibold">{c.label}.</span> {c.line}
              {c.link && (
                <>
                  {" "}
                  <a href={href(c.link.id)} target="_top" className={LINK}>{c.link.label}</a>
                  {"."}
                </>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
