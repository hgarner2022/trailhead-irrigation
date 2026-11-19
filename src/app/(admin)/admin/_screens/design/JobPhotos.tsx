"use client"

import { Photos } from "@/components/blocks/Photos"
import { SectionCard } from "@/components/blocks/SectionCard"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import type { PhotoItem } from "@/lib/photos/types"
import { noteOk } from "./job-fixtures"

// The job page's Photos card (Hannah, Nov 19 2026): what the customer sent, then what the crew took. "From Andrea" holds the customer's own
// uploads (from their account, a text's link, or when they booked: those say "Added when booked"), each with when it was added; staff
// can neither hide nor remove them. "Ours" holds the crew's photos, each with its Show to customer box, and the only Add photo. The
// checklist's camera icon adds to "Ours" only. A canceled job has no Ours; a group with nothing in it is left out except Ours.

const noAdd = async () => ({ ok: false as const, message: "Adding a photo is not wired in this prototype." })

export function JobPhotos({ photos, first, visitDone, canceled }: { photos: PhotoItem[]; first: string; visitDone: boolean; canceled?: boolean }) {
  const theirs = photos.filter((p) => p.byCustomer)
  const ours = photos.filter((p) => !p.byCustomer)
  return (
    <SectionCard title="Photos" id="photos-h">
      <div className="flex flex-col gap-5">
        {theirs.length > 0 && (
          <div className="flex flex-col gap-2">
            <SectionHeading id="photos-theirs-h">{`From ${first}`}</SectionHeading>
            <Photos bare heading={`From ${first}`} customerName={first} photos={theirs} audience="staff" className="[&_ul]:mt-0" />
          </div>
        )}
        {!canceled && (
          <div className="flex flex-col gap-2">
            <SectionHeading id="photos-ours-h">Ours</SectionHeading>
            <Photos bare heading="Ours" photos={ours} audience="staff" visitDone={visitDone} camera onAdd={noAdd} onShow={noteOk} onRemove={noteOk} className="[&_ul]:mt-0" />
          </div>
        )}
      </div>
    </SectionCard>
  )
}
