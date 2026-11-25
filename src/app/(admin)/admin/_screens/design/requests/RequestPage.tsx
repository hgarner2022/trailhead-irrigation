"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock, ClipboardList, MapPin, UserRound } from "lucide-react"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { Photos } from "@/components/blocks/Photos"
import { RecordChip } from "@/components/blocks/RecordChip"
import { recordHref } from "@/components/blocks/record-preview-model"
import { RecordFooter, type FooterAction } from "@/components/blocks/RecordFooter"
import { RecordPage } from "@/components/blocks/RecordPage"
import { RecordFacts } from "@/components/blocks/RecordPanel"
import { SectionCard } from "@/components/blocks/SectionCard"
import { StatusPill, type PillStatus } from "@/components/blocks/StatusPill"
import { SummaryBand, type SummaryItem } from "@/components/blocks/SummaryBand"
import { useToast } from "@/components/blocks/Toast"
import type { TimelineLine } from "@/lib/events/timeline"
import { NOW, noteOk } from "../job-fixtures"
import { ArchiveDialog, CreateJobDialog, type ChosenService, type CreateMode } from "./RequestDialogs"
import { isQuoteFirst, type ServicePick } from "./request-catalogue"
import { REQUEST_PILL, SOURCE_WORDS, cameIn, cameInOn, fullName, matchNote, matchOf, matchWords, serviceWords, stateOf, type ArchiveReason, type Match, type RequestData } from "./request-model"

// A request as a page of its own (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.2 to 4.5; Hannah's answers 2 and 3 of Nov 20 2026), on the
// record page frame: the person's name with its status, the band (when it came in, what they asked for, where, which customer they match), the customer's
// words and photos, the contact and a match panel in the aside. A request waits here until Ryan makes a job of it, even when its email matches a customer
// (the panel shows the match), so spam never becomes a customer. There are two ways out and the header has both: "Create job" and "Send a quote", plus
// Archive (asks why) and, under More, Mark as seen. The catalogue decides which is primary (`isQuoteFirst`): a service with no price (an installation,
// Christmas lights, the larger repair) leads with Send a quote, a priced one with Create job. Each opens a dialog that states the exact effect. Hannah, Nov
// 20 2026: nobody accepts anything, the request MOVES into what it became, so there is no accepted state. Nov 22 2026: Send a quote makes the customer and a QUOTE in
// Draft, never a job (the job is made when the quote is approved), and Create job on a priced service still makes a job at once; a stale link to a request that
// became a job or a quote opens a plain page that says so with the job or the quote as a chip, and one whose quote was archived says that too (archiving the quote
// archives the request). Nothing here reaches the customer. A result is a toast and the page changes, never a message in a section.
// Pure props: `onSeen`, `onCreateJob`, `onJobCreated` and `onArchive` let a host keep state and take Ryan to the job or the quote.

const LINK = "rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
const UNSCHEDULED = { status: "needs-a-day" as PillStatus, label: "Unscheduled" }
const DRAFT = { status: "quote-draft" as PillStatus, label: "Draft" }
const CHANNEL_WORDS = { text: "Text", email: "Email", both: "Text and email" }

export interface RequestPageProps {
  request: RequestData
  /** the moment "Came in" is counted from */
  now?: string
  /** the customers the match is read against; the fixtures' by default */
  match?: Match | null
  /** the job's stage once made (Create job), read from the job: Unscheduled, Canceled */
  jobStage?: { status: PillStatus; label: string }
  /** the quote's status once made (Send a quote), read from the quote: Draft, Sent, Approved, Declined, Replaced, Archived */
  quoteStage?: { status: PillStatus; label: string }
  /** opening a New request writes Seen once; a catalogue story that shows New turns it off */
  markSeenOnOpen?: boolean
  onSeen?: (request: RequestData) => void
  /** Create job or Send a quote: answers the id of the job or of the quote it made (by `mode`) and the customer it was added to */
  onCreateJob?: (request: RequestData, o: { asNew: boolean; mode: CreateMode; service: ChosenService }) => { id: string; customerId: string }
  /** the host takes Ryan to the new job or quote (the request has left the list) and shows the toast there; without it the page shows "This request became a job" or "a quote" in place */
  onJobCreated?: (id: string, message: string, mode: CreateMode) => void
  onArchive?: (request: RequestData, reason: ArchiveReason) => void
  /** the dialog a story opens at once */
  initialDialog?: "job" | "quote" | "archive" | null
  /** where the convert sheet's picker starts, when a story shows a service that was changed */
  initialPick?: ServicePick
}

interface Overlay {
  seen?: boolean
  becameJob?: RequestData["becameJob"]
  becameQuote?: RequestData["becameQuote"]
  archived?: RequestData["archived"]
}

function history(r: RequestData, now: string): TimelineLine[] {
  const first = r.first
  const lines: TimelineLine[] = []
  if (r.archived) lines.push({ id: "archived", at: r.archived.at, actor: "Ryan", what: `Archived the request: ${r.archived.reason}`, kind: "event" })
  if (r.becameJob) lines.push({ id: "job", at: r.becameJob.at, actor: "Ryan", what: `${fullName(r)}'s request became a job`, kind: "event" })
  if (r.becameQuote) lines.push({ id: "quote", at: r.becameQuote.at, actor: "Ryan", what: `${fullName(r)}'s request became quote ${r.becameQuote.quoteId}`, kind: "event" })
  if (r.seen && !r.becameJob && !r.becameQuote && !r.archived) lines.push({ id: "seen", at: now, actor: "Ryan", what: "Looked at the request", kind: "event" })
  lines.push({ id: "came", at: r.receivedAt, actor: first, what: `Sent a request${r.service ? ` for ${r.service}` : ""} from the ${SOURCE_WORDS[r.source].toLowerCase()}`, kind: "event" })
  return lines
}

export function RequestPage({ request, now = NOW.toISOString(), match: matchProp, jobStage = UNSCHEDULED, quoteStage = DRAFT, markSeenOnOpen = true, onSeen, onCreateJob, onJobCreated, onArchive, initialDialog = null, initialPick }: RequestPageProps) {
  const toast = useToast()
  const [overlay, setOverlay] = useState<Overlay>({})
  const [dialog, setDialog] = useState<"job" | "quote" | "archive" | null>(initialDialog)
  const r: RequestData = useMemo(() => ({ ...request, seen: request.seen || Boolean(overlay.seen), becameJob: overlay.becameJob ?? request.becameJob, becameQuote: overlay.becameQuote ?? request.becameQuote, archived: overlay.archived ?? request.archived }), [request, overlay])
  const state = stateOf(r)
  const name = fullName(r)
  const match = matchProp === undefined ? matchOf(r) : matchProp
  const quoteFirst = isQuoteFirst(r.service)

  // Seen is written once, when a person first opens it
  useEffect(() => {
    if (markSeenOnOpen && state === "new") {
      setOverlay((o) => ({ ...o, seen: true }))
      onSeen?.(request)
    }
    // once per request opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id])

  const markSeen = () => {
    setOverlay((o) => ({ ...o, seen: true }))
    onSeen?.(request)
    toast("Marked as seen")
  }
  const create = (o: { asNew: boolean; mode: CreateMode; service: ChosenService }) => {
    const made = onCreateJob?.(r, o) ?? { id: o.mode === "quote" ? `Q-${r.id.replace(/^rq-/, "")}` : `q-${r.id.replace(/^rq-/, "")}`, customerId: match && !o.asNew ? match.customer.id : `other-${r.first}-${r.last}`.toLowerCase() }
    const who = match && !o.asNew ? match.customer.name : name
    const message = o.mode === "quote" ? `Quote created for ${who}` : `Job created for ${who}`
    setOverlay((v) => ({ ...v, seen: true, ...(o.mode === "quote" ? { becameQuote: { quoteId: made.id, customerId: made.customerId, at: now } } : { becameJob: { jobId: made.id, customerId: made.customerId, at: now } }) }))
    if (onJobCreated) onJobCreated(made.id, message, o.mode)
    else toast(message)
  }
  const archive = (reason: ArchiveReason) => {
    setOverlay((v) => ({ ...v, seen: true, archived: { reason, at: now } }))
    onArchive?.(r, reason)
    toast(`Archived as ${reason}`)
  }

  const act = (label: string, onClick: () => void): FooterAction => ({ label, onClick })
  const jobAction = act("Create job", () => setDialog("job"))
  const quoteAction = act("Send a quote", () => setDialog("quote"))
  const archiveAction = act("Archive", () => setDialog("archive"))
  // a service with no price is quoted first: Send a quote is the way out, and Create job is not offered (a job that waits on a price is never made, Hannah, Nov 22 2026)
  const actions =
    state === "new" || state === "seen" ? (
      <RecordFooter primary={quoteFirst ? quoteAction : jobAction} secondary={quoteFirst ? [archiveAction] : [quoteAction, archiveAction]} more={state === "new" ? [act("Mark as seen", markSeen)] : undefined} />
    ) : undefined

  if (r.becameJob) return <BecameJobPage request={r} stage={jobStage} now={now} />
  if (r.becameQuote) return <BecameQuotePage request={r} stage={quoteStage} now={now} />

  const customerValue = match ? match.customer.name : "No match"
  const customerHref = match ? recordHref.customer(match.customer.id) : undefined
  const band: SummaryItem[] = [
    { label: "Came in", value: cameIn(r, now), sub: cameInOn(r.receivedAt), icon: Clock },
    { label: "Asked for", value: serviceWords(r), sub: SOURCE_WORDS[r.source], icon: ClipboardList },
    { label: "Where", value: r.street || "No address", sub: r.town ? `${r.town}, CO` : undefined, icon: MapPin },
    { label: "Customer", value: customerValue, sub: match ? [matchWords(match), matchNote(match)].filter(Boolean).join(". ") : r.email ? "No customer has this email or phone" : undefined, icon: UserRound, ...(customerHref ? { href: customerHref } : {}) },
  ]

  const archivedNote = r.archived ? `Archived as ${r.archived.reason}. No customer was added and nothing was sent.` : undefined

  return (
    <>
      <RecordPage
        crumb={{ label: "Requests", href: "/admin/requests" }}
        title={name}
        subtitle={`${serviceWords(r) === "Not said" ? "Request" : `Request for ${serviceWords(r)}`} · Came in ${cameInOn(r.receivedAt)}`}
        badges={
          <>
            <StatusPill status={REQUEST_PILL[state].status} label={REQUEST_PILL[state].label} size="lg" />
          </>
        }
        notice={archivedNote ? <p role="status" className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium shadow-sm">{archivedNote}</p> : undefined}
        band={<SummaryBand items={band} />}
        asideLabel="About this request"
        actions={actions}
        aside={
          <>
            <SectionCard title="Customer match" id="match-h">
              <MatchPanel match={match} request={r} />
            </SectionCard>
            <SectionCard title="Contact" id="contact-h">
              <RecordFacts
                divided
                rows={[
                  ["Phone", r.phone ? <a key="p" href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className={LINK}>{r.phone}</a> : "None given"],
                  ["Email", r.email ? <a key="e" href={`mailto:${r.email}`} className={LINK}>{r.email}</a> : "None given"],
                  ["Reach by", CHANNEL_WORDS[r.contact]],
                  ["Address", r.street ? `${r.street}, ${r.town}` : "None given"],
                ]}
              />
            </SectionCard>
            <SectionCard title="Notes and history" id="notes-h">
              <NotesAndHistory bare lines={history(r, now)} onAddNote={noteOk} now={NOW} />
            </SectionCard>
          </>
        }
      >
        <SectionCard title={`What ${r.first} wrote`} id="words-h">
          <p data-slot="request-words" className="whitespace-pre-wrap text-base">{r.words || "Nothing written."}</p>
        </SectionCard>
        {r.photos.length > 0 && (
          <SectionCard title="Photos" id="photos-h">
            <Photos bare heading={`From ${r.first}`} customerName={r.first} photos={r.photos} audience="staff" className="[&_ul]:mt-0" />
          </SectionCard>
        )}
      </RecordPage>
      {(dialog === "job" || dialog === "quote") && <CreateJobDialog request={r} match={match} mode={dialog} initialPick={initialPick} onClose={() => setDialog(null)} onCreate={create} />}
      {dialog === "archive" && <ArchiveDialog request={r} onClose={() => setDialog(null)} onArchive={archive} />}
    </>
  )
}

/** The plain page a request opens to once it became a job (a stale link, or the moment after Create job): it says so and offers the job as a chip. Never a dead end. */
export function BecameJobPage({ request, stage, now }: { request: RequestData; stage: { status: PillStatus; label: string }; now: string }) {
  const job = request.becameJob!
  const service = serviceWords(request)
  return (
    <RecordPage
      crumb={{ label: "Requests", href: "/admin/requests" }}
      title="This request became a job"
      subtitle={`${fullName(request)}'s request${service === "Not said" ? "" : ` for ${service}`} · Came in ${cameInOn(request.receivedAt)}`}
      actions={<RecordFooter primary={{ label: "Open job", href: recordHref.job(job.jobId) }} />}
    >
      <SectionCard title="Job" id="request-job-h">
        <div data-slot="became-job" className="flex flex-wrap items-center gap-2 text-sm">
          <RecordChip kind="job" name={service === "Not said" ? "Job" : service} href={recordHref.job(job.jobId)} />
          <StatusPill status={stage.status} label={stage.label} />
          <span className="text-muted-foreground">Made {cameIn({ ...request, receivedAt: job.at }, now)}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{request.first}&apos;s words and photos are on the job. The request is no longer in Requests.</p>
      </SectionCard>
    </RecordPage>
  )
}

/** The plain page a request opens to once it became a quote (a stale link, or the moment after Send a quote): it says so and offers the quote as a chip. When the quote was archived it says that, and that the request is archived with it. Never a dead end. */
export function BecameQuotePage({ request, stage, now }: { request: RequestData; stage: { status: PillStatus; label: string }; now: string }) {
  const quote = request.becameQuote!
  const service = serviceWords(request)
  const archived = request.archived
  return (
    <RecordPage
      crumb={{ label: "Requests", href: "/admin/requests" }}
      title={archived ? "This request became a quote that was archived" : "This request became a quote"}
      subtitle={`${fullName(request)}'s request${service === "Not said" ? "" : ` for ${service}`} · Came in ${cameInOn(request.receivedAt)}`}
      badges={archived ? <StatusPill status={REQUEST_PILL.archived.status} label={REQUEST_PILL.archived.label} size="lg" /> : undefined}
      actions={<RecordFooter primary={{ label: "Open quote", href: recordHref.quote(quote.quoteId) }} />}
    >
      <SectionCard title="Quote" id="request-quote-h">
        <div data-slot="became-quote" className="flex flex-wrap items-center gap-2 text-sm">
          <RecordChip kind="quote" name={quote.quoteId} href={recordHref.quote(quote.quoteId)} />
          <StatusPill status={stage.status} label={stage.label} />
          <span className="text-muted-foreground">Made {cameIn({ ...request, receivedAt: quote.at }, now)}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{archived ? `The quote was archived as ${archived.reason}. This request is archived with it.` : `${request.first}'s words and photos are on the quote. The request is no longer in Requests.`}</p>
      </SectionCard>
    </RecordPage>
  )
}

/** "Matches Andrea Dalton" with the customer as a chip, or "No match". It is a hint to Ryan: making the job is his decision. */
export function MatchPanel({ match, request }: { match: Match | null; request: RequestData }) {
  if (!match) {
    return (
      <div data-slot="match-panel" data-match="no" className="flex flex-col gap-1 text-sm">
        <p className="font-semibold">No match</p>
        <p className="text-muted-foreground">No customer has this email or phone. Creating the job adds {fullName(request)} as a customer.</p>
      </div>
    )
  }
  return (
    <div data-slot="match-panel" data-match="yes" className="flex flex-col gap-1 text-sm">
      <p className="flex flex-wrap items-center gap-x-2 font-semibold">
        Matches
        <RecordChip kind="customer" name={match.customer.name} href={recordHref.customer(match.customer.id)} />
      </p>
      <p className="text-muted-foreground">
        {matchWords(match)}. {match.customer.street}.
      </p>
      {matchNote(match) && (
        <p data-slot="match-note" className="font-semibold text-foreground">
          {matchNote(match)}.
        </p>
      )}
      <p className="text-muted-foreground">A match is a hint. The request waits until you make a job of it.</p>
    </div>
  )
}
