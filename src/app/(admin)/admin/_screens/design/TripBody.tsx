"use client"

import { Checklist } from "@/components/blocks/Checklist"
import { NotesAndHistory } from "@/components/blocks/NotesAndHistory"
import { RecordFacts } from "@/components/blocks/RecordPanel"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import type { ConfirmFacts } from "./confirm-copy"
import { JobPhotos } from "./JobPhotos"
import type { ScheduleResult } from "./ScheduleDialog"
import { NOW, noteOk } from "./job-fixtures"
import { Actions, CONTACT, type CollectHandlers } from "./JobPageParts"
import type { TripData } from "./trip-fixtures"

// What one Season Pass trip holds when it opens in place (Hannah, Nov 19 2026: "the Season Pass job still needs the checklist and all that
// jazz"): the same blocks as the one-trip job page, never copies. When and Who as text (the day's one link is the band's tile, and a person is never a link), the trip's own actions by state (`Actions`: Move,
// On my way as a split button, Mark done, then "How is this paid?", which for a pass reads "Charge the card as agreed" with the card chosen),
// its checklist from the service's template, its photos (From Andrea, Ours) and its notes. Pure props.

export function tripFacts(t: NonNullable<TripData["trip"]>): ConfirmFacts {
  return { first: "Andrea", customer: "Andrea Dalton", channel: "text", email: "andrea.dalton@example.com", firstText: false, late: false, service: t.service, amount: `$${t.price}`, phone: CONTACT.sms, address: "480 Briggs St", cardWords: "Visa ending 4242", dueOn: "Dec 2" }
}

export function TripBody({ trip, onDo, handlers, onSchedule }: { trip: TripData; onDo?: (label: string, variant?: string) => void; handlers?: CollectHandlers; onSchedule?: (r: ScheduleResult) => void }) {
  const t = trip.trip!
  const done = t.state === "done" || t.state === "charged"
  return (
    <>
      <RecordFacts
        className="mt-0"
        rows={[
          ["When", <span key="w" className="inline-flex flex-wrap items-center gap-2">{t.day}<span className="font-normal text-muted-foreground">{t.time}</span></span>],
          ["Who", t.people.join(", ")],
        ]}
      />
      {(t.footer.primary || t.footer.secondary || t.footer.more?.length) && <Actions plan={t.footer} facts={tripFacts(t)} onDo={onDo} collect={t.collect} handlers={handlers} onSchedule={onSchedule} />}
      {t.state !== "canceled" && <Checklist bare items={t.checklist} />}
      {t.state !== "canceled" && (
        <div className="flex flex-col gap-2">
          <SectionHeading id={`${trip.id}-photos-h`}>Photos</SectionHeading>
          <JobPhotos bare photos={t.photos} first="Andrea" visitDone={done} />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <SectionHeading id={`${trip.id}-notes-h`}>Notes and history</SectionHeading>
        <NotesAndHistory bare lines={t.notes} onAddNote={noteOk} now={NOW} />
      </div>
    </>
  )
}
