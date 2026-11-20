import { textParts } from "../editable"

// A text as the customer's phone shows it: a Messages thread from "Trailhead" with one grey bubble. A link in the text is drawn as a short domain with no path or
// query shown (the sent text carries the full signed link). The words are the renderer's, character for character.

const URL_RE = /(https?:\/\/[^\s]+)/g

/** "trailheadirrigation.com/p/7k2m" for the pay link, ".../v/ab12" for a visit link, ".../a/9x3k" for the account: short, and nothing of the real address on screen. */
export function shortLink(url: string): string {
  if (/\/pay\//.test(url)) return "trailheadirrigation.com/p/7k2m"
  if (/\/visits\//.test(url) || /\/admin\//.test(url)) return "trailheadirrigation.com/v/ab12"
  if (/\/quote\//.test(url)) return "trailheadirrigation.com/q/4d8w"
  return "trailheadirrigation.com/a/9x3k"
}

export function TextBubble({ body, width = 340, from = "Trailhead", time = "Today, 9:41 am" }: { body: string; width?: number; from?: string; time?: string }) {
  const parts = textParts(body)
  return (
    <figure data-slot="text-bubble" className="mx-auto w-full overflow-hidden rounded-[28px] border border-border bg-white shadow-sm" style={{ maxWidth: width }}>
      <div className="border-b border-border bg-stone/70 px-4 pb-3 pt-4 text-center">
        <span aria-hidden className="mx-auto flex size-10 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">T</span>
        <p className="mt-1 text-sm font-semibold text-foreground">{from}</p>
      </div>
      <div className="px-3 pb-5 pt-4">
        <p className="mb-1 text-center text-xs text-muted-foreground">{time}</p>
        <p data-slot="phone-bubble" className="max-w-[17.5rem] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-border px-3.5 py-2 text-[15px] leading-snug text-foreground">
          {body.split(URL_RE).map((p, i) => (i % 2 === 1 ? <span key={i} className="font-medium text-navy underline underline-offset-2">{shortLink(p)}</span> : p))}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{body.length} characters, {parts} {parts === 1 ? "part" : "parts"} as sent.</p>
      </div>
    </figure>
  )
}
