import { cn } from "@/lib/utils"

export type Step = { title: string; body: string }

// The one numbered list: a big orange display number beside a bold title
// and one plain paragraph. Service pages use it for "what happens on the
// visit"; anything else that counts steps should too, so the numbers look
// the same on every page (Hannah, Nov 5 2026: consistency).

export function StepList({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn("flex flex-col gap-6 list-none", className)}>
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-5">
          <span className="font-display text-3xl font-bold text-primary leading-none w-8 shrink-0">{i + 1}</span>
          <div className="max-w-[60ch]">
            <p className="font-semibold text-foreground mb-1">{step.title}</p>
            <p className="text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
