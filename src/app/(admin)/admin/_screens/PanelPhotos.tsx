"use client"

import { Photos, type PhotoAnswer } from "@/components/blocks/Photos"
import { SectionHeading } from "@/components/blocks/SectionHeading"
import type { AdminData, Visit } from "@/lib/admin/types"
import { PHOTO_WORDS } from "@/lib/photos/rules"
import { addPhotoFlow, type AddPhotoResult } from "@/lib/photos/upload"
import type { PhotoActions } from "./action-types"
import { dayLabel, dayOfVisit, kindLabel } from "./visit-panel-model"

// The Photos block as the visit panel and the job panel use it: the photos of one visit from `AdminData.photos`, and the panel's `photos` actions
// behind Add photo, "Show to customer" and Remove. Nothing when the data carries no photos (the catalog's fixtures), since there is nowhere to put
// one. A tech sees the photos of the visits they had and has no "Show to customer" box. The file goes from the browser straight to the private
// store; `add` only tells the API which file arrived.

const answer = async (call: Promise<{ ok: true } | { ok: false; message: string }>): Promise<PhotoAnswer> => {
  const out = await call
  return out.ok ? { ok: true } : out
}

interface Common {
  data: AdminData
  readOnly: boolean
  actions?: PhotoActions
}

/** One visit's photos, in the visit panel (under the facts, before Notes and history). */
export function VisitPhotos({ data, visitId, visitDone, readOnly, actions }: Common & { visitId: string; visitDone: boolean }) {
  if (!data.photos) return null
  const photos = data.photos.filter((p) => p.visitId === visitId)
  const onAdd = actions
    ? (file: File) =>
        addPhotoFlow(file, {
          visitId,
          confirm: async (v, key): Promise<AddPhotoResult> => {
            const out = await actions.add(v, key)
            return out.ok ? { ok: true, photo: out.data } : { ok: false, message: out.message || PHOTO_WORDS.uploadFailed }
          },
        })
    : undefined
  return (
    <Photos
      key={visitId}
      photos={photos}
      configured={data.photosConfigured !== false}
      visitDone={visitDone}
      canShow={!readOnly}
      onAdd={onAdd}
      onShow={actions ? (id, shown) => answer(actions.show(id, shown)) : undefined}
      onRemove={actions ? (id) => answer(actions.remove(id)) : undefined}
    />
  )
}

/** Every visit's photos on the job, one group per visit that has any, under one heading (the job panel). Adding is on the visit's own panel. */
export function JobPhotos({ data, visits, readOnly, actions }: Common & { visits: Visit[] }) {
  if (!data.photos) return null
  const ids = new Set(visits.map((v) => v.id))
  if (!data.photos.some((p) => ids.has(p.visitId))) return null
  return (
    <section aria-labelledby="job-photos" data-slot="job-photos">
      <SectionHeading id="job-photos">Photos</SectionHeading>
      {visits.map((v) => {
        const photos = data.photos!.filter((p) => p.visitId === v.id)
        if (photos.length === 0) return null
        const d = dayOfVisit(v)
        const label = `${kindLabel(v)}${d ? `, ${dayLabel(d)}` : ""}`
        return (
          <div key={v.id} className="mt-3">
            <p className="text-sm font-medium">{label}</p>
            <Photos
              bare
              heading={label}
              photos={photos}
              configured={data.photosConfigured !== false}
              visitDone={v.status === "completed"}
              canShow={!readOnly}
              onShow={actions ? (id, shown) => answer(actions.show(id, shown)) : undefined}
              onRemove={actions ? (id) => answer(actions.remove(id)) : undefined}
            />
          </div>
        )
      })}
    </section>
  )
}
