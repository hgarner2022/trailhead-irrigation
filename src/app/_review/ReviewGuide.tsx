import { CHANGED_SINCE_LAST_REVIEW, REVIEW_PARTS } from "./review-steps"

// The review guide's Docs page: Part 1 admin, Part 2 customer, then what changed. Every link comes from review-steps.ts. The links open in the
// Storybook window (`target="_top"`), not inside the docs frame.

const href = (id: string) => `/?path=/story/${id}`

export function ReviewGuide() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 text-base leading-7 text-foreground">
      <header>
        <h1 className="font-display text-3xl font-semibold text-navy">Start here</h1>
        <p className="mt-2">Everything to review, in the order to walk it. Each link opens the story; the line after it says what to look at.</p>
      </header>
      {REVIEW_PARTS.map((part) => (
        <section key={part.title} aria-labelledby={part.title}>
          <h2 id={part.title} className="font-display text-2xl font-semibold text-navy">{part.title}</h2>
          <p className="mt-1 text-muted-foreground">{part.intro}</p>
          <ol className="mt-3 list-decimal space-y-2 pl-6">
            {part.steps.map((step, i) => (
              <li key={`${step.id}-${i}`}>
                <a href={href(step.id)} target="_top" className="font-semibold text-primary-dark underline underline-offset-2">{step.label}</a>
                {". "}
                {step.look}
              </li>
            ))}
          </ol>
        </section>
      ))}
      <section aria-labelledby="changed">
        <h2 id="changed" className="font-display text-2xl font-semibold text-navy">What changed since the last review</h2>
        <ul className="mt-3 list-disc space-y-1 pl-6">
          {CHANGED_SINCE_LAST_REVIEW.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
