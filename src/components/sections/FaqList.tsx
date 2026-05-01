import { cn } from "@/lib/utils"

export type FaqItem = {
  question: string
  answer: string
}

// Shared FAQ accordion using native <details> (zero JS, accessible by
// default, no hydration cost). Replaces 9 copy-pasted variants across
// the site.

type FaqListProps = {
  faqs: FaqItem[]
  /** Card background color — defaults to "background"; use "cream" for cards on a white page bg. */
  itemBg?: "background" | "cream"
  className?: string
}

export function FaqList({ faqs, itemBg = "cream", className }: FaqListProps) {
  const itemBgClass = itemBg === "cream" ? "bg-cream" : "bg-background"
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {faqs.map((faq) => (
        <details
          key={faq.question}
          className={cn(
            "group border border-border rounded-lg",
            itemBgClass
          )}
        >
          <summary className="flex cursor-pointer items-center justify-between p-5 font-medium text-foreground">
            {faq.question}
            <span className="ml-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
              &#9662;
            </span>
          </summary>
          <div className="px-5 pb-5">
            <p className="text-muted-foreground leading-relaxed">
              {faq.answer}
            </p>
          </div>
        </details>
      ))}
    </div>
  )
}
