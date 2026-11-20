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
import { AcceptDialog, ArchiveDialog } from "./RequestDialogs"
import { REQUEST_PILL, SOURCE_WORDS, cameIn, cameInOn, fullName, matchOf, matchWords, serviceWords, stateOf, type ArchiveReason, type Match, type RequestData } from "./request-model"

// A request as a page of its own (docs/plans/2026-11-20-requests-and-quotes-research.md, 4.2 to 4.5; Hannah's answers 2 and 3 of Nov 20 2026), on the
// record page frame: the person's name with its status, the band (when it came in, what they asked for, where, which customer they match), the customer's
// words and photos, the contact and a match panel in the aside. A request waits here until Ryan presses Accept, even when its email matches a customer
// (the panel shows the match), so spam never becomes a customer. The header's actions: Accept (primary), Archive (asks why) and, under More, Mark as seen.
// Accept opens a dialog that states the exact effect; afterwards the page shows the job as a chip with its stage. Nothing here reaches the customer. A
// result is a toast and the page changes state, never a message in a section. Pure props: `onSeen`, `onAccept` and `onArchive` let a host keep state.

const LINK = "rounded-sm text-primary-dark underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
const NEEDS_A_QUOTE = { status: "needs-a-day" as PillStatus, label: "Needs a quote" }
const CHANNEL_WORDS = { text: "Text", email: "Email", both: "Text and email" }

export interface RequestPageProps {
  request: RequestData
  /** the moment "Came in" is counted from */
  now?: string
  /** the customers the match is read against; the fixtures' by default */
  match?: Match | null
  /** the job's stage once accepted, read from the job: Needs a quote, Quote sent, Open, Canceled */
  jobStage?: { status: PillStatus; label: string }
  /** opening a New request writes Seen once; a catalogue story that shows New turns it off */
  markSeenOnOpen?: boolean
  onSeen?: (request: RequestData) => void
  /** Accept: answers the job it made and the customer it was added to */
  onAccept?: (request: RequestData, o: { asNew: boolean }) => { jobId: string; customerId: string }
  onArchive?: (request: RequestData, reason: ArchiveReason) => void
  /** the dialog a story opens at once */
  initialDialog?: "accept" | "archive" | null
}

interface Overlay {
  seen?: boolean
  accepted?: RequestData["accepted"]
  archived?: RequestData["archived"]
}

function history(r: RequestData, now: string): TimelineLine[] {
  const first = r.first
  const lines: TimelineLine[] = []
  if (r.archived) lines.push({ id: "archived", at: r.archived.at, actor: "Ryan", what: `Archived the request: ${r.archived.reason}`, kind: "event" })
  if (r.accepted) lines.push({ id: "accepted", at: r.accepted.at, actor: "Ryan", what: "Accepted the request and created a job", kind: "event" })
  if (r.seen && !r.accepted && !r.archived) lines.push({ id: "seen", at: now, actor: "Ryan", what: "Looked at the request", kind: "event" })
  lines.push({ id: "came", at: r.receivedAt, actor: first, what: `Sent a request${r.service ? ` for ${r.service}` : ""} from the ${SOURCE_WORDS[r.source].toLowerCase()}`, kind: "event" })
  return lines
}

export function RequestPage({ request, now = NOW.toISOString(), match: matchProp, jobStage = NEEDS_A_QUOTE, markSeenOnOpen = true, onSeen, onAccept, onArchive, initialDialog = null }: RequestPageProps) {
  const toast = useToast()
  const [overlay, setOverlay] = useState<Overlay>({})
  const [dialog, setDialog] = useState<"accept" | "archive" | null>(initialDialog)
  const r: RequestData = useMemo(() => ({ ...request, seen: request.seen || Boolean(overlay.seen), accepted: overlay.accepted ?? request.accepted, archived: overlay.archived ?? request.archived }), [request, overlay])
  const state = stateOf(r)
  const name = fullName(r)
  const match = matchProp === undefined ? matchOf(r) : matchProp
  const acceptedCustomer = r.accepted?.customerId

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
  const accept = (o: { asNew: boolean }) => {
    const made = onAccept?.(r, o) ?? { jobId: `q-${r.id.replace(/^rq-/, "")}`, customerId: match && !o.asNew ? match.customer.id : `other-${r.first}-${r.last}`.toLowerCase() }
    setOverlay((v) => ({ ...v, seen: true, accepted: { ...made, at: now } }))
    toast(match && !o.asNew ? `Created a job for ${match.customer.name}` : `Added ${name} as a customer and created a job`)
  }
  const archive = (reason: ArchiveReason) => {
    setOverlay((v) => ({ ...v, seen: true, archived: { reason, at: now } }))
    onArchive?.(r, reason)
    toast(`Archived as ${reason}`)
  }

  const act = (label: string, onClick: () => void): FooterAction => ({ label, onClick })
  const actions =
    state === "new" || state === "seen" ? (
      <RecordFooter primary={act("Accept", () => setDialog("accept"))} secondary={[act("Archive", () => setDialog("archive"))]} more={state === "new" ? [act("Mark as seen", markSeen)] : undefined} />
    ) : state === "accepted" ? (
      <RecordFooter primary={{ label: "Open job", href: recordHref.job(r.accepted!.jobId) }} />
    ) : undefined

  const customerValue = state === "accepted" ? name : match ? match.customer.name : "No match"
  const customerHref = state === "accepted" ? recordHref.customer(acceptedCustomer!) : match ? recordHref.customer(match.customer.id) : undefined
  const band: SummaryItem[] = [
    { label: "Came in", value: cameIn(r, now), sub: cameInOn(r.receivedAt), icon: Clock },
    { label: "Asked for", value: serviceWords(r), sub: SOURCE_WORDS[r.source], icon: ClipboardList },
    { label: "Where", value: r.street || "No address", sub: r.town ? `${r.town}, CO` : undefined, icon: MapPin },
    { label: "Customer", value: customerValue, sub: state === "accepted" ? "Added when accepted" : match ? matchWords(match) : r.email ? "No customer has this email or phone" : undefined, icon: UserRound, ...(customerHref ? { href: customerHref } : {}) },
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
            {state === "accepted" && <StatusPill status={jobStage.status} label={jobStage.label} size="lg" />}
          </>
        }
        notice={archivedNote ? <p role="status" className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium shadow-sm">{archivedNote}</p> : undefined}
        band={<SummaryBand items={band} />}
        asideLabel="About this request"
        actions={actions}
        aside={
          <>
            {state === "accepted" && (
              <SectionCard title="Job" id="request-job-h">
                <div className="flex flex-col gap-2">
                  <RecordChip kind="job" name={serviceWords(r) === "Not said" ? "Job" : serviceWords(r)} href={recordHref.job(r.accepted!.jobId)} />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <StatusPill status={jobStage.status} label={jobStage.label} />
                  </div>
                </div>
              </SectionCard>
            )}
            <SectionCard title="Customer match" id="match-h">
              <MatchPanel state={state} match={match} request={r} />
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
      {dialog === "accept" && <AcceptDialog request={r} match={match} onClose={() => setDialog(null)} onAccept={accept} />}
      {dialog === "archive" && <ArchiveDialog request={r} onClose={() => setDialog(null)} onArchive={archive} />}
    </>
  )
}

/** "Matches Andrea Dalton" with the customer as a chip, or "No match". It is a hint to Ryan: Accept is his decision. */
export function MatchPanel({ state, match, request }: { state: ReturnType<typeof stateOf>; match: Match | null; request: RequestData }) {
  if (state === "accepted") {
    return (
      <div data-slot="match-panel" data-match={match ? "yes" : "no"} className="flex flex-col gap-1 text-sm">
        <p className="font-semibold">{match ? "Matched a customer" : "Added as a customer"}</p>
        <RecordChip kind="customer" name={fullName(request)} href={recordHref.customer(request.accepted!.customerId)} />
      </div>
    )
  }
  if (!match) {
    return (
      <div data-slot="match-panel" data-match="no" className="flex flex-col gap-1 text-sm">
        <p className="font-semibold">No match</p>
        <p className="text-muted-foreground">No customer has this email or phone. Accept adds {fullName(request)} as a customer.</p>
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
      <p className="text-muted-foreground">A match is a hint. The request waits until you accept it.</p>
    </div>
  )
}
