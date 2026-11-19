"use client"

import { useId, useRef, useState, useTransition, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { TIME_ZONE, shortDate } from "@/lib/admin/format"
import { PHOTO_ACCEPT, photoCount, PHOTO_WORDS } from "@/lib/photos/rules"
import type { PhotoItem } from "@/lib/photos/types"
import type { AddPhotoResult } from "@/lib/photos/upload"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "./ConfirmDialog"
import { SectionHeading } from "./SectionHeading"

// Photos: the pictures on one visit, for the visit panel, the job panel and the customer's visit page (docs/DATA_MODEL.md, photo). A grid
// of thumbnails (two across on a phone, four on a laptop), each opening the full picture in a new tab, and Add photo, which opens the phone's
// camera. The staff view adds who took it and a "Show to customer" box per photo (a staff photo reaches the customer only when it is on and
// the visit is Done) and Remove for the person who added it or an owner; the customer view has no box and Remove only on their own. An upload
// shows as a tile that says "Uploading", then becomes the photo; a file that is too big, not a photo, or did not arrive says so on a tile
// with Try again or Dismiss. Without the store's token it says "Photos are not set up yet." and offers no Add. The block takes photos and
// callbacks and knows nothing of the API or the store. Client component.

export type PhotoAnswer = { ok: true } | { ok: false; message: string }

/** An upload on its way, or one that did not make it. */
export interface PendingPhoto {
  key: string
  name: string
  state: "uploading" | "problem"
  /** what went wrong, in words, for a `problem` */
  message?: string
  /** kept so Try again can send it once more */
  file?: File
}

export interface PhotosProps {
  /** this visit's photos, oldest first */
  photos: PhotoItem[]
  audience?: "staff" | "customer"
  /** false while the store has no token: "Photos are not set up yet." and no Add */
  configured?: boolean
  /** adds one file (`addPhotoFlow`): the new photo or the words to show; without it there is no Add button */
  onAdd?: (file: File) => Promise<AddPhotoResult>
  /** staff: show a photo to the customer, or stop */
  onShow?: (photoId: string, shown: boolean) => Promise<PhotoAnswer>
  onRemove?: (photoId: string) => Promise<PhotoAnswer>
  /** open the camera on a phone rather than the library; staff in the field want it, a customer picking an old photo does not */
  camera?: boolean
  heading?: string
  /** no heading of its own: the job panel puts one heading over a group per visit, and this block is labelled by `heading` for a reader of the screen */
  bare?: boolean
  /** staff who may show a photo to the customer (a manager); a tech sees the photos and has no box. Default true */
  canShow?: boolean
  /** the visit is Done: tells staff a ticked photo is now visible; before then it says it will be */
  visitDone?: boolean
  /** uploads to show before anything is done (the stories) */
  initialPending?: PendingPhoto[]
  className?: string
}

const caption = (p: PhotoItem, audience: "staff" | "customer") => {
  if (p.addedAtBooking) return audience === "customer" ? "You · Added when booked" : "Customer · Added when booked"
  const first = (p.addedByName ?? p.addedBy.split("@")[0] ?? "Staff").split(/\s+/)[0] ?? "Staff"
  const who = audience === "customer" ? (p.byCustomer ? "You" : "Trailhead") : p.byCustomer ? "Customer" : `${first.charAt(0).toUpperCase()}${first.slice(1)}`
  return `${who} · ${shortDate(p.createdAt, TIME_ZONE)}`
}

function Tile({ photo, audience, canShow, onShow, onRemove, onAsk }: { photo: PhotoItem; audience: "staff" | "customer"; canShow: boolean; onShow?: PhotosProps["onShow"]; onRemove?: PhotosProps["onRemove"]; onAsk: (p: PhotoItem) => void }) {
  const box = useId()
  const [problem, setProblem] = useState("")
  const [shown, setShown] = useState(photo.shownToCustomer)
  const [last, setLast] = useState(photo.shownToCustomer)
  // the box follows the record when the page brings a newer one, and holds the person's press until then
  if (last !== photo.shownToCustomer) {
    setLast(photo.shownToCustomer)
    setShown(photo.shownToCustomer)
  }
  const staffOwn = audience === "staff" && !photo.byCustomer && canShow
  const toggle = async (next: boolean) => {
    setShown(next)
    setProblem("")
    const out = await (onShow ? onShow(photo.id, next) : Promise.resolve<PhotoAnswer>({ ok: true }))
    if (!out.ok) {
      setShown(!next)
      setProblem(out.message)
    }
  }
  return (
    <li data-slot="photo" data-photo-id={photo.id} className="flex min-w-0 flex-col gap-1.5">
      <a href={photo.url} target="_blank" rel="noopener" aria-label={`Open photo, ${caption(photo, audience)}`} className="block overflow-hidden rounded-lg border border-border bg-stone">
        {/* A plain img on purpose: the picture is behind a sign-in, and next/image's optimizer fetches without the visitor's cookie. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={`Photo added ${caption(photo, audience)}`} loading="lazy" className="aspect-square w-full object-cover" />
      </a>
      <p className="text-xs text-muted-foreground">{caption(photo, audience)}</p>
      {staffOwn && (
        <div className="flex min-h-11 items-center gap-2 text-sm">
          <input id={box} type="checkbox" checked={shown} onChange={(e) => void toggle(e.target.checked)} aria-labelledby={`${box}-text`} className="size-5 shrink-0 accent-primary" />
          <span id={`${box}-text`}>Show to customer</span>
        </div>
      )}
      {audience === "staff" && photo.byCustomer && <p className="text-xs text-muted-foreground">Added by the customer</p>}
      {photo.canRemove && onRemove && (
        <Button type="button" variant="ghost" size="sm" className="min-h-11 self-start px-2 text-muted-foreground" onClick={() => onAsk(photo)}>
          Remove
        </Button>
      )}
      <p role="alert" className="text-xs text-destructive empty:hidden">
        {problem}
      </p>
    </li>
  )
}

function PendingTile({ item, onRetry, onDismiss }: { item: PendingPhoto; onRetry: (item: PendingPhoto) => void; onDismiss: (key: string) => void }) {
  const failed = item.state === "problem"
  return (
    <li data-slot="photo-pending" data-state={item.state} className="flex min-w-0 flex-col gap-1.5">
      <div className={cn("flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center text-sm", failed ? "border-destructive/50 bg-destructive/5" : "border-dashed border-border bg-stone")}>
        {failed ? (
          <p role="alert" className="font-medium text-destructive">
            {item.message ?? PHOTO_WORDS.uploadFailed}
          </p>
        ) : (
          <p role="status" className="text-muted-foreground">
            Uploading
          </p>
        )}
        <p className={cn("max-w-full truncate text-xs", failed ? "text-foreground" : "text-muted-foreground")}>{item.name}</p>
      </div>
      {failed && (
        <div className="flex gap-1">
          {item.file && item.message === PHOTO_WORDS.uploadFailed && (
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => onRetry(item)}>
              Try again
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" className="min-h-11 px-2" onClick={() => onDismiss(item.key)}>
            Dismiss
          </Button>
        </div>
      )}
    </li>
  )
}

export function Photos({ photos, audience = "staff", configured = true, onAdd, onShow, onRemove, camera = audience === "staff", heading = "Photos", bare = false, canShow = true, visitDone, initialPending = [], className }: PhotosProps) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingPhoto[]>(initialPending)
  const [added, setAdded] = useState<PhotoItem[]>([])
  const [asked, setAsked] = useState<PhotoItem | null>(null)
  const [gone, setGone] = useState<string[]>([])
  const [, start] = useTransition()
  // A photo just added shows at the end until the page brings it back in `photos`; one just removed is hidden until the page drops it.
  const shown = [...photos, ...added.filter((a) => !photos.some((p) => p.id === a.id))].filter((p) => !gone.includes(p.id))

  const send = (file: File, key: string) => {
    if (!onAdd) return
    start(async () => {
      const out = await onAdd(file).catch((): AddPhotoResult => ({ ok: false, message: PHOTO_WORDS.uploadFailed }))
      if (out.ok) {
        setAdded((rows) => [...rows, out.photo])
        setPending((rows) => rows.filter((r) => r.key !== key))
      } else setPending((rows) => rows.map((r) => (r.key === key ? { ...r, state: "problem", message: out.message } : r)))
    })
  }
  const begin = (files: File[]) => {
    for (const file of files) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`
      setPending((rows) => [...rows, { key, name: file.name, state: "uploading", file }])
      send(file, key)
    }
  }
  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (files.length) begin(files)
  }
  const retry = (item: PendingPhoto) => {
    if (!item.file) return
    setPending((rows) => rows.map((r) => (r.key === item.key ? { ...r, state: "uploading", message: undefined } : r)))
    send(item.file, item.key)
  }
  const remove = async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    const photo = asked
    if (!photo) return { ok: true }
    const out = onRemove ? await onRemove(photo.id) : ({ ok: true } as PhotoAnswer)
    if (out.ok) setGone((ids) => [...ids, photo.id])
    return out
  }

  const empty = shown.length === 0 && pending.length === 0
  return (
    <section {...(bare ? { "aria-label": heading } : { "aria-labelledby": `${id}-heading` })} data-slot="photos" className={className}>
      {!bare && <SectionHeading id={`${id}-heading`}>{heading}</SectionHeading>}
      {!configured ? (
        <p className="mt-2 text-sm text-muted-foreground">{PHOTO_WORDS.notSetUp}</p>
      ) : (
        <>
          {audience === "staff" && canShow && shown.some((p) => !p.byCustomer) && (
            <p className="mt-2 text-sm text-muted-foreground">{visitDone ? "A photo you show reaches the customer now." : "A photo you show reaches the customer once the visit is Done."}</p>
          )}
          {empty ? (
            <p className="mt-2 text-sm text-muted-foreground">{PHOTO_WORDS.empty}</p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              {shown.map((p) => (
                <Tile key={p.id} photo={p} audience={audience} canShow={canShow} onShow={onShow} onRemove={onRemove} onAsk={setAsked} />
              ))}
              {pending.map((item) => (
                <PendingTile key={item.key} item={item} onRetry={retry} onDismiss={(key) => setPending((rows) => rows.filter((r) => r.key !== key))} />
              ))}
            </ul>
          )}
          {onAdd && (
            <>
              <input ref={input} type="file" accept={PHOTO_ACCEPT} multiple {...(camera ? { capture: "environment" as const } : {})} onChange={onPick} aria-label="Choose photos" className="sr-only" tabIndex={-1} />
              <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={() => input.current?.click()}>
                Add photo
              </Button>
            </>
          )}
        </>
      )}
      <ConfirmDialog
        slot="photo-remove"
        destructive
        title="Remove this photo"
        message={audience === "customer" ? "It is removed from your visit." : "It is removed for everyone. Only you or an owner can take it away."}
        confirmLabel="Remove photo"
        open={asked !== null}
        onOpenChange={(open) => !open && setAsked(null)}
        onConfirm={remove}
      />
    </section>
  )
}

/** "2 photos added" for the Done step's second beat, or null when none were added on the visit. */
export const photosAddedWords = (n: number): string | null => (n > 0 ? `${photoCount(n)} added` : null)
