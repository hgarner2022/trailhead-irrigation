import { cn } from "@/lib/utils"
import { MailFrame } from "./MailFrame"
import { TextBubble } from "./TextBubble"
import { byId, type Channel } from "./catalog"

// One message, drawn the way the customer meets it. On a laptop: the text (a phone Messages bubble) beside the line that says when it is sent and why, then the live
// email (Current) and the new layout (Proposed) side by side. On a phone: the text and the Proposed email alone at 375px. A channel that does not exist yet is badged
// "Prototype, not built yet". Nothing is sent: the data is made up (./fixtures.ts) and the words come from the real renderers.

export const PROTOTYPE_BADGE = "Prototype, not built yet"

function Badge({ children, tone = "quiet" }: { children: string; tone?: "quiet" | "built" }) {
  return <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", tone === "built" ? "border-success/40 bg-success/10 text-foreground" : "border-border bg-stone text-muted-foreground")}>{children}</span>
}

const CLASS_WORDS = { transactional: "Transactional", marketing: "Marketing", "to the crew": "To the crew, not the customer" } as const

export function MessageStory({ id, view }: { id: string; view: "laptop" | "phone" }) {
  const m = byId(id)
  const phone = view === "phone"
  const isProto = (c: Channel) => Boolean(m.prototype?.includes(c))
  const text = m.text?.(Boolean(m.firstText))
  const current = m.current?.() ?? null
  const proposedEmail = m.proposed?.() ?? null
  return (
    <div data-slot="message-story" className={cn("space-y-6", phone ? "mx-auto max-w-[375px]" : "")}>
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-semibold text-navy">{m.name}</h1>
        <div className="flex flex-wrap gap-2">
          <Badge>{CLASS_WORDS[m.klass]}</Badge>
          <Badge>{m.channels.map((c) => (c === "text" ? "Text" : "Email")).join(" and ")}</Badge>
          {m.prototype?.length === m.channels.length ? <Badge>{PROTOTYPE_BADGE}</Badge> : <Badge tone="built">{m.noTrigger ? "Built, no trigger yet" : "Built"}</Badge>}
        </div>
        <p className="text-base leading-7 text-foreground"><span className="font-semibold">When it is sent. </span>{m.when}</p>
      </header>

      {text !== undefined && (
        <section aria-label="The text" className={cn("grid gap-4", phone ? "" : "lg:grid-cols-[340px_1fr] lg:items-start")}>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-foreground">The text</h2>{isProto("text") && <Badge>{PROTOTYPE_BADGE}</Badge>}</div>
            <TextBubble body={text} />
          </div>
          {!phone && <TextNotes first={Boolean(m.firstText)} crew={m.klass === "to the crew"} />}
        </section>
      )}

      {(current || proposedEmail) && (
        <section aria-label="The email" className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-foreground">The email</h2>{isProto("email") && <Badge>{PROTOTYPE_BADGE}</Badge>}</div>
          {phone ? (
            proposedEmail && <MailFrame label="Proposed" subject={proposedEmail.subject} html={proposedEmail.html} text={proposedEmail.text} width={375} dark />
          ) : (
            <div className={cn("grid items-start gap-6", current && proposedEmail ? "xl:grid-cols-2" : "")}>
              {current && <MailFrame label="Current" subject={current.subject} html={current.html} text={current.text} width={600} />}
              {proposedEmail && <MailFrame label="Proposed" subject={proposedEmail.subject} html={proposedEmail.html} text={proposedEmail.text} width={600} dark />}
              {!current && <p className="text-sm text-muted-foreground">There is no current email: this one is new.</p>}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function TextNotes({ first, crew }: { first: boolean; crew: boolean }) {
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
      <li>Opens &ldquo;Trailhead:&rdquo; and is plain ASCII, so a part holds 160 characters.</li>
      <li>{crew ? "To the crew or the office: no opt-out line." : first ? "This is the first text this number gets, so it ends \"Reply STOP to opt out.\" Later texts leave that line off." : "Not the first text this number has had, so there is no opt-out line."}</li>
      <li>The link is drawn short here; the sent text carries the full signed link.</li>
    </ul>
  )
}
